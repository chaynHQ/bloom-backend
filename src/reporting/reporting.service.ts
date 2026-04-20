import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ReportingRunEntity } from 'src/entities/reporting-run.entity';
import { Logger } from 'src/logger/logger';
import { reportingTimezone } from 'src/utils/constants';
import { LessThan, Not, Repository } from 'typeorm';
import { computeRange } from './date-range.util';
import { DbMetricsService } from './db-metrics.service';
import { Ga4MetricsService } from './ga4-metrics.service';
import {
  Anomaly,
  BaselineStat,
  DB_METRIC_KEYS,
  DB_METRIC_LABELS,
  GA4_OVERVIEW_KEYS,
  GA4_OVERVIEW_LABELS,
  Ga4OverviewMetrics,
  PERIODS_WITH_BASELINE,
  ReportBaseline,
  ReportPayload,
  ReportPeriod,
  ReportWindow,
  RunOptions,
} from './reporting.types';
import { buildReportBlocks } from './slack-blocks.builder';

/** Minimum prior runs required to compute a baseline. Below this, stats are
 *  too noisy to be useful. */
const MIN_BASELINE_SAMPLES = 3;

/** How many prior runs to pull when computing the rolling baseline. */
const BASELINE_WINDOW_SIZE = 4;

/** |z| threshold that qualifies as an "anomaly". */
const ANOMALY_SIGMA_THRESHOLD = 2;

/** How many anomalies to surface at the top of the digest. */
const ANOMALY_LIMIT = 3;

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

    this.logger.log(
      `Reporting run start: period=${period} window=${window.label} trigger=${trigger}`,
    );

    const runId = await this.claimRunSlot(period, window, opts.bypassIdempotency === true);
    if (!runId) {
      this.logger.log(
        `Reporting run skipped: period=${period} window=${window.label} already claimed`,
      );
      return {
        period,
        window,
        db: { unavailable: true, reason: 'idempotency: run already claimed' },
        ga4: {
          overview: { unavailable: true, reason: 'idempotency: run already claimed' },
          events: { unavailable: true, reason: 'idempotency: run already claimed' },
          breakdowns: [],
          eventBreakdowns: [],
        },
        trigger,
      };
    }

    const [db, ga4, baseline] = await Promise.all([
      this.safeCollectDb(window),
      this.safeCollectGa4(window, period),
      this.safeLoadBaseline(period, window),
    ]);

    const anomalies = baseline
      ? computeAnomalies(db, ga4.overview, baseline)
      : undefined;

    const payload: ReportPayload = {
      period,
      window,
      db,
      ga4,
      trigger,
      runId,
      ...(baseline ? { baseline } : {}),
      ...(anomalies ? { anomalies } : {}),
    };

    const blocks = buildReportBlocks(payload);
    const fallbackText = `Bloom ${period} digest — ${window.label}`;

    try {
      const slackResponse = await this.slackMessageClient.sendMessageToReportingChannel(blocks, {
        fallbackText,
      });
      await this.markSent(runId, payload, slackResponse);
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
        select: { id: true },
      });
      if (existing) {
        await this.reportingRunRepository.update(
          { id: existing.id },
          { status: 'pending', error: null },
        );
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
    slackResponse: unknown,
  ): Promise<void> {
    try {
      await this.reportingRunRepository.update(
        { id: runId },
        {
          status: 'sent',
          slackResponse: this.serialiseResponse(slackResponse),
          ...this.toMetricColumns(payload),
        },
      );
    } catch (err) {
      this.logger.warn(
        `Reporting: failed to update run status → sent: ${err?.message || 'unknown error'}`,
      );
    }
  }

  private toMetricColumns(payload: ReportPayload): Partial<ReportingRunEntity> {
    const { db, ga4 } = payload;
    const cols: Partial<ReportingRunEntity> = {};

    if (!('unavailable' in db)) {
      for (const key of DB_METRIC_KEYS) {
        cols[key] = db[key];
      }
    }

    cols.ga4Overview = 'unavailable' in ga4.overview ? null : ga4.overview;
    cols.ga4Events = 'unavailable' in ga4.events ? null : ga4.events;
    cols.ga4Breakdowns = ga4.breakdowns.length > 0 ? ga4.breakdowns : null;
    cols.ga4EventBreakdowns = ga4.eventBreakdowns.length > 0 ? ga4.eventBreakdowns : null;

    return cols;
  }

  private async markFailed(
    runId: string,
    payload: ReportPayload,
    error: string,
  ): Promise<void> {
    try {
      await this.reportingRunRepository.update(
        { id: runId },
        { status: 'failed', error, ...this.toMetricColumns(payload) },
      );
    } catch (err) {
      this.logger.warn(
        `Reporting: failed to update run status → failed: ${err?.message || 'unknown error'}`,
      );
    }
  }

  private serialiseResponse(resp: unknown): unknown {
    if (resp && typeof resp === 'object' && 'status' in resp) {
      const r = resp as { status?: number; statusText?: string };
      return { status: r.status, statusText: r.statusText };
    }
    return { note: 'no slack response body recorded' };
  }

  private async safeCollectDb(window: ReportPayload['window']): Promise<ReportPayload['db']> {
    try {
      return await this.dbMetricsService.collect(window);
    } catch (err) {
      this.logger.error(`Reporting DB metrics failed: ${err?.message || 'unknown error'}`);
      return { unavailable: true, reason: err?.message || 'unknown error' };
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

  /**
   * Fetch the last ~4 prior `sent` runs of this cadence and compute per-metric
   * rolling baselines (mean + stdDev). Skipped for weekly and for any run
   * without enough prior history. Individual metrics whose column was null on
   * prior rows (e.g. DB collection failed that day) are simply skipped — the
   * baseline is per-key so a gap in one metric doesn't poison others.
   */
  private async safeLoadBaseline(
    period: ReportPeriod,
    window: ReportWindow,
  ): Promise<ReportBaseline | undefined> {
    if (!PERIODS_WITH_BASELINE.includes(period)) return undefined;

    let prior: ReportingRunEntity[];
    try {
      // Include both 'sent' and 'failed' runs — failed runs persist valid
      // metric snapshots (Slack failure doesn't invalidate the numbers), so
      // excluding them would bias the baseline toward days where Slack
      // happened to be up. 'pending' rows are in-flight and must be skipped.
      prior = await this.reportingRunRepository.find({
        where: { periodType: period, periodStart: LessThan(window.from), status: Not('pending') },
        order: { periodStart: 'DESC' },
        take: BASELINE_WINDOW_SIZE,
      });
    } catch (err) {
      this.logger.warn(
        `Reporting: baseline lookup failed: ${err?.message || 'unknown error'}`,
      );
      return undefined;
    }

    if (prior.length < MIN_BASELINE_SAMPLES) return undefined;

    const dbBaseline: ReportBaseline['db'] = {};
    for (const key of DB_METRIC_KEYS) {
      const values = prior
        .map((row) => row[key])
        .filter((v): v is number => typeof v === 'number');
      const stat = computeBaseline(values);
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
      const stat = computeBaseline(values);
      if (stat) ga4Baseline[key] = stat;
    }

    return {
      db: dbBaseline,
      ga4Overview: ga4Baseline,
      sampleSize: prior.length,
    };
  }
}

/** Population mean + stdDev. Requires >= MIN_BASELINE_SAMPLES values. */
function computeBaseline(values: number[]): BaselineStat | undefined {
  if (values.length < MIN_BASELINE_SAMPLES) return undefined;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance), sampleSize: values.length };
}

/**
 * Find the top-N metrics whose current value deviates most from baseline
 * (|z| >= threshold). Empty array if nothing qualifies. Filters out metrics
 * with zero stdDev (no variance → z-score undefined) and metrics whose
 * current value is unavailable.
 */
function computeAnomalies(
  db: ReportPayload['db'],
  ga4Overview: ReportPayload['ga4']['overview'],
  baseline: ReportBaseline,
): Anomaly[] {
  const candidates: Array<Anomaly & { rawSigma: number }> = [];

  if (!('unavailable' in db)) {
    for (const key of DB_METRIC_KEYS) {
      const anomaly = scoreAnomaly('db', DB_METRIC_LABELS[key], db[key], baseline.db[key]);
      if (anomaly) candidates.push(anomaly);
    }
  }

  if (!('unavailable' in ga4Overview)) {
    for (const key of GA4_OVERVIEW_KEYS) {
      const anomaly = scoreAnomaly(
        'ga4',
        GA4_OVERVIEW_LABELS[key],
        ga4Overview[key],
        baseline.ga4Overview[key],
      );
      if (anomaly) candidates.push(anomaly);
    }
  }

  return candidates
    .filter((a) => Math.abs(a.rawSigma) >= ANOMALY_SIGMA_THRESHOLD)
    .sort((a, b) => Math.abs(b.rawSigma) - Math.abs(a.rawSigma))
    .slice(0, ANOMALY_LIMIT)
    .map((a): Anomaly => ({
      source: a.source,
      label: a.label,
      current: a.current,
      mean: a.mean,
      sigma: a.sigma,
    }));
}

function scoreAnomaly(
  source: 'db' | 'ga4',
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
