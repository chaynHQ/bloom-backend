import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ReportingRunEntity } from 'src/entities/reporting-run.entity';
import { Logger } from 'src/logger/logger';
import { isProduction, reportingTimezone } from 'src/utils/constants';
import { LessThan, Not, Repository } from 'typeorm';
import { computeRange } from './date-range.util';
import { DbMetricsService } from './db-metrics.service';
import { Ga4MetricsService } from './ga4-metrics.service';
import { ANOMALY_WATCHED_EVENTS, renderedEventNames } from './reporting.events';
import {
  Anomaly,
  BaselineStat,
  DB_METRIC_KEYS,
  DB_METRIC_LABELS,
  DbBreakdowns,
  DbMetrics,
  GA4_OVERVIEW_KEYS,
  GA4_OVERVIEW_LABELS,
  Ga4EventTotal,
  Ga4Metrics,
  Ga4OverviewMetrics,
  PERIOD_TUNING,
  PERIODS_WITH_FULL_DETAIL,
  ReportBaseline,
  ReportPayload,
  ReportPeriod,
  ReportWindow,
  RunOptions,
} from './reporting.types';
import { buildReportThread } from './slack-blocks.builder';

const MIN_BASELINE_SAMPLES = 3;
const ANOMALY_LIMIT = 3;

/** Daily-only: metrics where today=0 with ≥1 recent prior ≥ this floor almost
 *  always means an outage (tracking pipeline down, signup form broken, etc.)
 *  rather than a quiet day. Fires an anomaly bypassing the sigma threshold so
 *  it surfaces even when prior-day variance is high. */
const OUTAGE_PRIOR_FLOOR = 5;

interface OutageWatchedMetric {
  source: Anomaly['source'];
  /** Resolver for the current period's value. Returns `null` when the metric
   *  is unavailable (failed query, GA outage) — caller skips in that case. */
  current: (db: DbMetrics, ga4: Ga4Metrics) => number | null;
  /** Resolver returning each prior run's value for this metric (used to
   *  confirm the metric *normally* runs ≥ OUTAGE_PRIOR_FLOOR). */
  priorValues: (priors: ReportingRunEntity[]) => number[];
  label: string;
}

const OUTAGE_WATCHLIST: ReadonlyArray<OutageWatchedMetric> = [
  {
    source: 'db',
    label: DB_METRIC_LABELS.activeUsers,
    current: (db) => db.activeUsers,
    priorValues: (priors) =>
      priors.map((p) => p.activeUsers).filter((v): v is number => typeof v === 'number'),
  },
  {
    source: 'db',
    label: DB_METRIC_LABELS.newUsers,
    current: (db) => db.newUsers,
    priorValues: (priors) =>
      priors.map((p) => p.newUsers).filter((v): v is number => typeof v === 'number'),
  },
  {
    source: 'ga4',
    label: GA4_OVERVIEW_LABELS.activeUsers,
    current: (_db, ga4) => ('unavailable' in ga4.overview ? null : ga4.overview.activeUsers),
    priorValues: (priors) =>
      priors
        .map((p) => (p.ga4Overview as Ga4OverviewMetrics | null)?.activeUsers)
        .filter((v): v is number => typeof v === 'number'),
  },
];

@Injectable()
export class ReportingService {
  private readonly logger = new Logger('ReportingService');

  constructor(
    private readonly dbMetricsService: DbMetricsService,
    private readonly ga4MetricsService: Ga4MetricsService,
    private readonly slackMessageClient: SlackMessageClient,
    @InjectRepository(ReportingRunEntity)
    private readonly reportingRunRepository: Repository<ReportingRunEntity>,
  ) {}

  async run(period: ReportPeriod, opts: RunOptions = {}): Promise<ReportPayload> {
    const window = computeRange(period, new Date(), reportingTimezone);
    const trigger = opts.trigger ?? 'scheduled';

    // Off-prod (staging / dev / test) always bypasses the unique-slot lock so
    // repeat runs can be made in testing. Explicit `bypassIdempotency` still wins either way.
    const bypassIdempotency = opts.bypassIdempotency ?? !isProduction;

    this.logger.log(
      `Reporting run start: period=${period} window=${window.label} trigger=${trigger} bypassIdempotency=${bypassIdempotency}`,
    );

    const runId = await this.claimRunSlot(period, window, bypassIdempotency);
    if (!runId) {
      this.logger.log(
        `Reporting run skipped: period=${period} window=${window.label} already claimed`,
      );
      return {
        period,
        window,
        db: emptyDbMetrics(),
        ga4: {
          overview: { unavailable: true, reason: 'idempotency: run already claimed' },
          events: { unavailable: true, reason: 'idempotency: run already claimed' },
          breakdowns: [],
          eventBreakdowns: [],
        },
        trigger,
      };
    }

    const [db, dbBreakdowns, ga4, baselineResult] = await Promise.all([
      this.safeCollectDb(window),
      this.safeCollectDbBreakdowns(window, period),
      this.safeCollectGa4(window, period),
      this.safeLoadBaseline(period, window),
    ]);

    const { baseline, priors } = baselineResult;
    const anomalies = computeAnomalies(db, ga4, baseline, priors, period);

    const payload: ReportPayload = {
      period,
      window,
      db,
      ga4,
      trigger,
      runId,
      ...(dbBreakdowns ? { dbBreakdowns } : {}),
      ...(baseline ? { baseline } : {}),
      ...(anomalies && anomalies.length > 0 ? { anomalies } : {}),
    };

    const { parent, replies } = buildReportThread(payload);
    const fallbackText = `Bloom ${period} digest — ${window.label}`;

    try {
      // Post the parent first — its `ts` becomes the `thread_ts` for replies.
      const parentResponse = await this.slackMessageClient.postReportingMessage(parent, {
        fallbackText,
      });

      // Post replies sequentially. A single failed reply is logged but
      // doesn't fail the whole run — the parent is already in-channel and
      // future improvements (retry, partial-success status) are easier to
      // layer on once threading is in production.
      for (const reply of replies) {
        try {
          await this.slackMessageClient.postReportingMessage(reply.blocks, {
            fallbackText: `${fallbackText} — ${reply.key}`,
            threadTs: parentResponse.ts,
          });
        } catch (err) {
          this.logger.error(
            `Reporting thread reply failed (key=${reply.key}): ${err?.message || 'unknown error'}`,
          );
        }
      }

      await this.markSent(runId, payload, parentResponse);
    } catch (err) {
      this.logger.error(`Reporting Slack send failed: ${err?.message || 'unknown error'}`);
      await this.markFailed(runId, payload, err?.message || 'unknown error');
    }

    this.logger.log(`Reporting run complete: period=${period} window=${window.label}`);
    return payload;
  }

  private async claimRunSlot(
    period: ReportPeriod,
    window: ReportWindow,
    bypassIdempotency: boolean,
  ): Promise<string | null> {
    if (bypassIdempotency) {
      const existing = await this.reportingRunRepository.findOne({
        where: { periodType: period, periodStart: window.from },
        select: { id: true, status: true },
      });
      if (existing) {
        // Only re-claim slots that aren't `sent` — a previously successful
        // run carries the canonical metric snapshot used for future
        // baselines, and resetting it back to `pending` would discard that
        // until the new run completes (or never, if the new run crashes).
        // The manual-run case for a successful slot is "I want to re-post
        // the same digest"; tolerate the no-op by reusing the same id and
        // leaving the row alone.
        if (existing.status !== 'sent') {
          await this.reportingRunRepository.update(
            { id: existing.id },
            { status: 'pending', error: null },
          );
        }
        return existing.id;
      }
      const created = await this.reportingRunRepository.save({
        periodType: period,
        periodStart: window.from,
        periodEnd: window.to,
        status: 'pending',
      } as ReportingRunEntity);
      return created.id;
    }

    const result = await this.reportingRunRepository
      .createQueryBuilder()
      .insert()
      .into(ReportingRunEntity)
      .values({
        periodType: period,
        periodStart: window.from,
        periodEnd: window.to,
        status: 'pending',
      })
      .orIgnore()
      .returning(['id'])
      .execute();

    const inserted = (result.raw as Array<{ id: string }>) ?? [];
    return inserted[0]?.id ?? null;
  }

  private async markSent(
    runId: string,
    payload: ReportPayload,
    slackResponse: { ts: string; channel: string },
  ): Promise<void> {
    try {
      await this.reportingRunRepository.update(
        { id: runId },
        {
          status: 'sent',
          slackTs: slackResponse.ts,
          slackResponse: { ts: slackResponse.ts, channel: slackResponse.channel },
          ...this.toMetricColumns(payload),
        },
      );
    } catch (err) {
      // Slack already received the digest but the DB transition didn't land —
      // the slot stays `pending`, so the next scheduled run for the same
      // period could re-post the same message. Surface at error level (not
      // warn) so on-call notices, and include identifiers needed to manually
      // flip the row to `sent` in the DB.
      this.logger.error(
        `Reporting: failed to mark run sent (runId=${runId} period=${payload.period} ` +
          `window=${payload.window.label} slackTs=${slackResponse.ts}) — risk of duplicate ` +
          `post on next run: ${err?.message || 'unknown error'}`,
      );
    }
  }

  /** Snapshot the payload onto reporting_run for queryable audit + baselines. */
  private toMetricColumns(payload: ReportPayload): Partial<ReportingRunEntity> {
    const { db, ga4, dbBreakdowns, anomalies, window, period } = payload;
    const cols: Partial<ReportingRunEntity> = {};

    // null is preserved so a failed query doesn't poison future baselines.
    for (const key of DB_METRIC_KEYS) {
      cols[key] = db[key];
    }

    cols.periodTimezone = window.timezone;
    cols.dbBreakdowns = dbBreakdowns ?? null;
    cols.ga4Overview = 'unavailable' in ga4.overview ? null : ga4.overview;
    cols.ga4Events = persistedGa4Events(ga4.events, period);
    cols.ga4Breakdowns = ga4.breakdowns.length > 0 ? ga4.breakdowns : null;
    cols.ga4EventBreakdowns = ga4.eventBreakdowns.length > 0 ? ga4.eventBreakdowns : null;
    cols.anomalies = anomalies && anomalies.length > 0 ? anomalies : null;

    return cols;
  }

  private async markFailed(runId: string, payload: ReportPayload, error: string): Promise<void> {
    try {
      await this.reportingRunRepository.update(
        { id: runId },
        { status: 'failed', error, ...this.toMetricColumns(payload) },
      );
    } catch (err) {
      // Slack send already failed; if we *also* can't record the failure, the
      // slot stays `pending` and a future cron will replay this period.
      // Surface at error level so the row can be reconciled by hand.
      this.logger.error(
        `Reporting: failed to mark run failed (runId=${runId} period=${payload.period} ` +
          `window=${payload.window.label} originalError="${error}"): ` +
          `${err?.message || 'unknown error'}`,
      );
    }
  }

  /** `DbMetricsService.collect()` swallows per-metric failures into `null`s,
   *  so this only catches the very unlikely "everything failed before any
   *  query ran" case. Returns an all-null DbMetrics so the renderer can show
   *  `N/A` for every key without a separate unavailable branch. */
  private async safeCollectDb(window: ReportPayload['window']): Promise<ReportPayload['db']> {
    try {
      return await this.dbMetricsService.collect(window);
    } catch (err) {
      this.logger.error(`Reporting DB metrics failed wholesale: ${err?.message || 'unknown error'}`);
      return emptyDbMetrics();
    }
  }

  /** Daily strips topic detail in the Slack message — skip the 11 GROUP BY
   *  joins on every daily run since their output is never rendered. */
  private async safeCollectDbBreakdowns(
    window: ReportPayload['window'],
    period: ReportPeriod,
  ): Promise<DbBreakdowns | undefined> {
    if (!PERIODS_WITH_FULL_DETAIL.includes(period)) return undefined;
    try {
      return await this.dbMetricsService.collectBreakdowns(window);
    } catch (err) {
      this.logger.warn(`Reporting DB breakdowns failed: ${err?.message || 'unknown error'}`);
      return undefined;
    }
  }

  private async safeCollectGa4(
    window: ReportPayload['window'],
    period: ReportPeriod,
  ): Promise<ReportPayload['ga4']> {
    try {
      return await this.ga4MetricsService.collect(window, period);
    } catch (err) {
      this.logger.warn(`Reporting GA4 metrics failed: ${err?.message || 'unknown error'}`);
      return {
        overview: { unavailable: true, reason: err?.message || 'unknown error' },
        events: { unavailable: true, reason: err?.message || 'unknown error' },
        breakdowns: [],
        eventBreakdowns: [],
      };
    }
  }

  /** Per-key: a metric that was null on prior rows is skipped, so a gap in
   *  one metric doesn't poison the baselines of others.
   *
   *  Returns the baseline (when computable) AND the raw prior rows — the
   *  outage-watchlist pass in `computeAnomalies` needs the priors directly
   *  to confirm a metric is "normally non-zero" before flagging today's 0. */
  private async safeLoadBaseline(
    period: ReportPeriod,
    window: ReportWindow,
  ): Promise<{ baseline?: ReportBaseline; priors: ReportingRunEntity[] }> {
    let prior: ReportingRunEntity[];
    try {
      // Include 'failed' runs — Slack send failure doesn't invalidate the
      // metric snapshot, and excluding them would bias the baseline toward
      // days Slack was up. 'pending' rows are in-flight, skip those.
      prior = await this.reportingRunRepository.find({
        where: { periodType: period, periodStart: LessThan(window.from), status: Not('pending') },
        order: { periodStart: 'DESC' },
        take: PERIOD_TUNING[period].baselineWindowSize,
      });
    } catch (err) {
      this.logger.warn(`Reporting: baseline lookup failed: ${err?.message || 'unknown error'}`);
      return { priors: [] };
    }

    // Yearly (and underbaselined quarterly) rarely accumulate the 3 priors
    // needed for a real rolling baseline. When we have ≥1 prior, fall back
    // to a single-sample "prior-period" comparison: `mean = prior value,
    // stdDev = 0, sampleSize = 1`. The renderer interprets `sampleSize === 1`
    // as `vs prior` instead of `vs avg`, and anomaly scoring skips zero-σ
    // baselines (no false z-scores from a single data point).
    const synthetic = prior.length < MIN_BASELINE_SAMPLES;
    if (synthetic && prior.length === 0) return { priors: [] };

    const dbBaseline: ReportBaseline['db'] = {};
    for (const key of DB_METRIC_KEYS) {
      const values = prior.map((row) => row[key]).filter((v): v is number => typeof v === 'number');
      const stat = synthetic ? priorPeriodStat(values) : computeBaseline(values);
      if (stat) dbBaseline[key] = stat;
    }

    const ga4Baseline: ReportBaseline['ga4Overview'] = {};
    for (const key of GA4_OVERVIEW_KEYS) {
      const values = prior
        .map((row) => {
          const ov = row.ga4Overview as Ga4OverviewMetrics | null;
          return ov?.[key];
        })
        .filter((v): v is number => typeof v === 'number');
      const stat = synthetic ? priorPeriodStat(values) : computeBaseline(values);
      if (stat) ga4Baseline[key] = stat;
    }

    // Per-event baselines for every rendered event + the anomaly watchlist.
    // Costs zero extra GA4 quota — baselines are computed from already-
    // persisted JSONB on prior reporting_run rows. Renderer keys per-line
    // cells off these so every event line shown in Slack carries a delta on
    // weekly+. A missing event on a prior row contributes nothing to the
    // mean (rather than 0, which would bias the average downward).
    const eventsBaseline: ReportBaseline['ga4Events'] = {};
    const priorEventIndex = prior.map((row) => {
      const events = row.ga4Events as Ga4EventTotal[] | null;
      const m = new Map<string, number>();
      if (events) for (const e of events) m.set(e.eventName, e.eventCount);
      return m;
    });
    const eventNames = new Set<string>([
      ...renderedEventNames(),
      ...ANOMALY_WATCHED_EVENTS.map((w) => w.event),
    ]);
    for (const event of eventNames) {
      const values = priorEventIndex
        .map((idx) => idx.get(event))
        .filter((v): v is number => typeof v === 'number');
      const stat = synthetic ? priorPeriodStat(values) : computeBaseline(values);
      if (stat) eventsBaseline[event] = stat;
    }

    return {
      baseline: {
        db: dbBaseline,
        ga4Overview: ga4Baseline,
        ga4Events: eventsBaseline,
        sampleSize: prior.length,
      },
      priors: prior,
    };
  }
}

/** Synthetic single-sample baseline used as the yearly fallback (and any
 *  period without enough priors for a rolling baseline). `stdDev = 0`
 *  signals "no variance to score against" — `scoreAnomaly` skips these, and
 *  `formatDelta` renders `vs prior` instead of `vs avg`. */
function priorPeriodStat(values: number[]): BaselineStat | undefined {
  if (values.length === 0) return undefined;
  // Always read the most recent prior (values are pre-ordered DESC by
  // periodStart at the find() above).
  const mean = values[0];
  return { mean, stdDev: 0, sampleSize: 1 };
}

function computeBaseline(values: number[]): BaselineStat | undefined {
  if (values.length < MIN_BASELINE_SAMPLES) return undefined;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance), sampleSize: values.length };
}

/** Top-N metrics with |z| >= threshold. Skips metrics with zero variance
 *  (z-score undefined) or unavailable current values. Outage-watchlist
 *  anomalies (daily only) are prepended unconditionally — they bypass the
 *  sigma cut because a "today=0, normally ≥5" event is the exact thing the
 *  daily snapshot exists to surface, and high prior-day variance would
 *  otherwise hide it behind the z-score threshold. */
function computeAnomalies(
  db: ReportPayload['db'],
  ga4: Ga4Metrics,
  baseline: ReportBaseline | undefined,
  priors: ReportingRunEntity[],
  period: ReportPeriod,
): Anomaly[] {
  const outage = period === 'daily' ? computeOutageAnomalies(db, ga4, priors) : [];

  if (!baseline) return outage;

  const sigmaThreshold = PERIOD_TUNING[period].anomalySigmaThreshold;
  const candidates: Array<Anomaly & { rawSigma: number }> = [];

  for (const key of DB_METRIC_KEYS) {
    // null current → query failed this run, skip (no anomaly to score).
    if (db[key] === null) continue;
    const anomaly = scoreAnomaly('db', DB_METRIC_LABELS[key], db[key] as number, baseline.db[key]);
    if (anomaly) candidates.push(anomaly);
  }

  if (!('unavailable' in ga4.overview)) {
    const ov = ga4.overview;
    for (const key of GA4_OVERVIEW_KEYS) {
      const anomaly = scoreAnomaly(
        'ga4',
        GA4_OVERVIEW_LABELS[key],
        ov[key],
        baseline.ga4Overview[key],
      );
      if (anomaly) candidates.push(anomaly);
    }
  }

  // Score curated events against their per-event baselines. Missing events in
  // the current window count as 0 — the watchlist is small and explicit, so
  // "error event absent from report" is a real data point (not a gap).
  if (!('unavailable' in ga4.events)) {
    const byName = new Map<string, number>();
    for (const e of ga4.events) byName.set(e.eventName, e.eventCount);
    for (const { event, label } of ANOMALY_WATCHED_EVENTS) {
      const current = byName.get(event) ?? 0;
      const anomaly = scoreAnomaly('ga4-event', label, current, baseline.ga4Events[event]);
      if (anomaly) candidates.push(anomaly);
    }
  }

  const scored = candidates
    .filter((a) => Math.abs(a.rawSigma) >= sigmaThreshold)
    // De-dup against outages by (source, label) — an outage already covers
    // this metric with a clearer message, so the sigma-scored entry is noise.
    .filter((a) => !outage.some((o) => o.source === a.source && o.label === a.label))
    .sort((a, b) => Math.abs(b.rawSigma) - Math.abs(a.rawSigma))
    .slice(0, Math.max(0, ANOMALY_LIMIT - outage.length))
    .map(
      (a): Anomaly => ({
        source: a.source,
        label: a.label,
        current: a.current,
        mean: a.mean,
        sigma: a.sigma,
      }),
    );

  return [...outage, ...scored];
}

/** Daily-only: detect "today=0 but the metric normally runs ≥ OUTAGE_PRIOR_FLOOR"
 *  for a small curated watchlist (signup pipeline, GA tracking). Returns an
 *  Anomaly per hit with `sigma=0` as a sentinel — the renderer treats sigma=0
 *  outages as "expected ~N — tracking down?" rather than a percent delta. */
function computeOutageAnomalies(
  db: ReportPayload['db'],
  ga4: Ga4Metrics,
  priors: ReportingRunEntity[],
): Anomaly[] {
  const out: Anomaly[] = [];
  for (const watched of OUTAGE_WATCHLIST) {
    const current = watched.current(db, ga4);
    if (current === null || current > 0) continue;
    const values = watched.priorValues(priors);
    if (!values.some((v) => v >= OUTAGE_PRIOR_FLOOR)) continue;
    const meanPrior = values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);
    out.push({
      source: watched.source,
      label: watched.label,
      current: 0,
      mean: meanPrior,
      sigma: 0,
    });
  }
  return out;
}

function scoreAnomaly(
  source: Anomaly['source'],
  label: string,
  current: number,
  stat: BaselineStat | undefined,
): (Anomaly & { rawSigma: number }) | null {
  if (!stat || stat.stdDev === 0) return null;
  const rawSigma = (current - stat.mean) / stat.stdDev;
  // Round for display; keep raw for threshold filtering so the boundary
  // (|z| = 2.0) is stable under floating-point rounding.
  const sigma = Math.round(rawSigma * 10) / 10;
  return { source, label, current, mean: stat.mean, sigma, rawSigma };
}

/** Daily fires 365x/year — trim to the renderer's allowlist so dynamic-name
 *  (ACCORDION_<title>, STORYBLOK_BUTTON_<text>) and Google auto-events
 *  don't bloat that cadence. Also keep the anomaly watchlist (e.g.
 *  REGISTER_SUCCESS is watched but not rendered in EVENT_GROUPS), so the
 *  audit trail covers every event the system reasons about. Weekly+ keeps
 *  the full literal copy. */
function persistedGa4Events(
  events: Ga4Metrics['events'],
  period: ReportPeriod,
): Ga4EventTotal[] | null {
  if ('unavailable' in events) return null;
  if (period !== 'daily') return events;
  const allow = new Set<string>([
    ...renderedEventNames(),
    ...ANOMALY_WATCHED_EVENTS.map((w) => w.event),
  ]);
  return events.filter((e) => allow.has(e.eventName));
}

/** All-null DbMetrics — used by the idempotency-skip path and the
 *  defence-in-depth wholesale-failure fallback. Renderer prints N/A for
 *  each key without a separate `{ unavailable }` branch. */
function emptyDbMetrics(): ReportPayload['db'] {
  return Object.fromEntries(DB_METRIC_KEYS.map((k) => [k, null])) as ReportPayload['db'];
}
