import { DateTime } from 'luxon';
import { SLACK_BLOCK_SAFETY_MARGIN } from './reporting.constants';
import { EVENT_GROUPS, EventLine, EventTopic } from './reporting.events';
import {
  Anomaly,
  BaselineStat,
  DB_METRIC_LABELS,
  DbBreakdowns,
  DbMetrics,
  DbNamedCount,
  GA4_OVERVIEW_LABELS,
  Ga4EventBreakdown,
  Ga4EventTotal,
  Ga4Metrics,
  Ga4OverviewMetrics,
  PERIOD_TUNING,
  PERIODS_WITH_ERRORS_THREAD,
  PERIODS_WITH_FULL_DETAIL,
  PERIODS_WITH_UNCAPPED_BREAKDOWNS,
  ReportBaseline,
  ReportPayload,
  ReportPeriod,
  ReportWindow,
} from './reporting.types';

/** Cap on breakdown children per group; uncapped for quarterly + yearly. */
const CHILDREN_CAP_PER_GROUP = 8;

/** Slack max fields per `section` block. */
const FIELDS_PER_SECTION = 10;

/** Max tag/named-count rows packed into one condensed line. */
const CONDENSED_NAMED_LIMIT = 8;

/** DB cells shown in the daily headline — trimmed from the weekly+ set so
 *  the daily snapshot stays scannable on a low-traffic site. Acquisition,
 *  retention, the three engagement surfaces, and chat. */
const DAILY_HEADLINE_KEYS: ReadonlyArray<keyof DbMetrics> = [
  'newUsers',
  'activeUsers',
  'coursesStarted',
  'resourcesStarted',
  'therapySessionsCompleted',
  'messagesSent',
];

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  short_video: 'Short videos',
  single_video: 'Single videos',
  conversation: 'Conversations',
};

type Block = Record<string, unknown>;

interface GridCell {
  label: string;
  /** `null` is rendered as `N/A`. Distinct from `0` (a real observation). */
  value: number | null;
  baseline?: BaselineStat;
  decimals?: number;
  /** Optional sub-row appended below the value/composite. Used by
   *  `analyticsEventsBlocks` to render `↳ <param>: A (n) · B (n) · C (n)`
   *  GA4 custom-dim breakdowns under their parent event line. */
  subline?: string;
}

interface RenderContext {
  period: ReportPeriod;
  withDetail: boolean;
  uncapped: boolean;
  baseline?: ReportBaseline;
  /** Per-period delta-suppression floor (see PERIOD_TUNING). Threaded through
   *  the cell formatter so daily can render small but meaningful movements
   *  that weekly+'s higher floor would suppress. */
  deltaBaselineFloor: number;
}

/** A thread reply for a single topic. `key` is for logging/correlation;
 *  `blocks` is what goes into Slack. */
export interface ThreadReply {
  key: EventTopic;
  blocks: Block[];
}

/** Parent message + per-topic thread replies. Parent stays focused on
 *  headline + anomalies; replies carry topic detail. */
export interface ReportThread {
  parent: Block[];
  replies: ThreadReply[];
}

export function buildReportThread(payload: ReportPayload): ReportThread {
  const ctx: RenderContext = {
    period: payload.period,
    withDetail: PERIODS_WITH_FULL_DETAIL.includes(payload.period),
    uncapped: PERIODS_WITH_UNCAPPED_BREAKDOWNS.includes(payload.period),
    baseline: payload.baseline,
    deltaBaselineFloor: PERIOD_TUNING[payload.period].deltaBaselineFloor,
  };

  const parent: Block[] = [];
  // Daily uses a lighter mrkdwn title (no `header` block) so it visually
  // reads as a "snapshot" in the channel — distinct from the heavier weekly+
  // digests. Saves one block and one section divider.
  if (payload.period === 'daily') {
    parent.push(dailyTitleBlock(payload));
  } else {
    parent.push(headerBlock(payload));
  }
  parent.push(contextBlock(payload));

  const headline = headlineSection(payload, ctx);
  if (headline.length > 0) {
    parent.push(dividerBlock());
    parent.push(...headline);
  }

  const gaBanner = gaUnavailableBanner(payload);
  if (gaBanner) parent.push(gaBanner);

  const anomalies = payload.anomalies ?? [];
  if (anomalies.length > 0) {
    parent.push(dividerBlock());
    parent.push(...anomaliesSection(anomalies, ctx.baseline));
  }

  const replies: ThreadReply[] = [];
  for (const topic of TOPIC_ORDER) {
    const out = renderTopic(topic, payload, ctx);
    if (out.length === 0) continue;
    // Trailing blank line creates visual breathing room between this reply
    // and the next thread message in the Slack UI.
    out.push(mrkdwnSection(' '));
    replies.push({ key: topic, blocks: capReplyBlocks(out) });
  }

  return { parent, replies };
}

/** Backwards-compatible single-message renderer (flattens thread). */
export function buildReportBlocks(payload: ReportPayload): Block[] {
  const { parent, replies } = buildReportThread(payload);
  const blocks: Block[] = [...parent];
  for (const reply of replies) {
    blocks.push(dividerBlock());
    blocks.push(...reply.blocks);
  }

  if (blocks.length > SLACK_BLOCK_SAFETY_MARGIN) {
    const trimmed = blocks.slice(0, SLACK_BLOCK_SAFETY_MARGIN - 1);
    trimmed.push(
      mrkdwnSection(
        `_Report truncated to fit Slack's block limit — ${blocks.length - trimmed.length} section(s) omitted._`,
      ),
    );
    return trimmed;
  }

  return blocks;
}

function capReplyBlocks(blocks: Block[]): Block[] {
  if (blocks.length <= SLACK_BLOCK_SAFETY_MARGIN) return blocks;
  const trimmed = blocks.slice(0, SLACK_BLOCK_SAFETY_MARGIN - 1);
  trimmed.push(
    mrkdwnSection(`_Section truncated — ${blocks.length - trimmed.length} block(s) omitted._`),
  );
  return trimmed;
}

const TOPIC_ORDER: EventTopic[] = [
  'users',
  'courses',
  'resources',
  'therapy',
  'communications',
  'admin',
  'navigation',
  'errors',
  'app',
];

const TOPIC_HEADINGS: Record<EventTopic, { emoji: string; title: string }> = {
  users: { emoji: ':busts_in_silhouette:', title: 'Users & accounts' },
  courses: { emoji: ':open_book:', title: 'Courses & sessions' },
  resources: { emoji: ':headphones:', title: 'Resources' },
  therapy: { emoji: ':cherry_blossom:', title: 'Therapy' },
  communications: { emoji: ':envelope_with_arrow:', title: 'Communications' },
  navigation: { emoji: ':compass:', title: 'Navigation & engagement' },
  admin: { emoji: ':gear:', title: 'Admin activity' },
  errors: { emoji: ':warning:', title: 'Errors' },
  app: { emoji: ':chart_with_upwards_trend:', title: 'Site analytics' },
};

function renderTopic(topic: EventTopic, payload: ReportPayload, ctx: RenderContext): Block[] {
  // Daily drops all per-topic thread replies — the snapshot lives entirely
  // in the parent message (headline + anomalies). Errors are surfaced via
  // the outage watchlist + GA-event anomaly scoring, so a dedicated Errors
  // reply no longer adds signal.
  if (ctx.period === 'daily') return [];

  // Errors thread only on the periods in PERIODS_WITH_ERRORS_THREAD (weekly).
  // Long-period summaries (monthly+) skip it — by then individual error
  // counts are stale and dilute the trend view.
  if (topic === 'errors' && !PERIODS_WITH_ERRORS_THREAD.includes(ctx.period)) {
    return [];
  }

  const body = renderTopicBody(topic, payload, ctx);
  if (body.length === 0) {
    if (topic === 'errors') {
      return [topicHeader('errors'), mrkdwnSection('_No errors in this period._')];
    }
    return [];
  }
  return [topicHeader(topic), ...body];
}

function renderTopicBody(topic: EventTopic, payload: ReportPayload, ctx: RenderContext): Block[] {
  switch (topic) {
    case 'users':
      return usersTopic(payload, ctx);
    case 'courses':
      return coursesTopic(payload, ctx);
    case 'resources':
      return resourcesTopic(payload, ctx);
    case 'therapy':
      return therapyTopic(payload, ctx);
    case 'communications':
      return communicationsTopic(payload, ctx);
    case 'app':
      return appTopic(payload, ctx);
    case 'navigation':
      return navigationTopic(payload, ctx);
    case 'admin':
      return adminTopic(payload, ctx);
    case 'errors':
      return errorsTopic(payload, ctx);
  }
}

/** Topic bodies share a three-section shape: Database totals → DB breakdowns →
 *  Analytics events. Each section is a uniformly-formatted 2-col grid. */

function usersTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [];

  out.push(
    ...dbTotalsGrid(payload, ctx, [
      'newUsers',
      'newPartnerUsers',
      'deletedUsers',
      'activeUsers',
      'partnerAccessGrants',
      'partnerAccessActivations',
    ]),
  );

  if (!ctx.withDetail) return out;

  out.push(
    ...namedBreakdownsBlocks(ctx, [
      { label: 'New users by partner', rows: payload.dbBreakdowns?.newUsersByPartner },
      { label: 'New users by signup language', rows: payload.dbBreakdowns?.newUsersByLanguage },
      {
        label: 'Partner-access grants by partner',
        rows: payload.dbBreakdowns?.partnerAccessGrantsByPartner,
      },
      {
        label: 'Partner-access activations by partner',
        rows: payload.dbBreakdowns?.partnerAccessActivationsByPartner,
      },
    ]),
    ...analyticsEventsBlocks('users', payload.ga4, ctx),
  );

  return out;
}

function coursesTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [];

  out.push(
    ...dbTotalsGrid(payload, ctx, [
      'coursesStarted',
      'coursesCompleted',
      'sessionsStarted',
      'sessionsCompleted',
      'sessionFeedbackSubmitted',
    ]),
  );

  if (!ctx.withDetail) return out;

  out.push(
    ...courseBreakdownBlocks(payload.dbBreakdowns, ctx),
    ...condensedTagBlocks('Session feedback by tag', payload.dbBreakdowns?.sessionFeedbackByTag),
    ...analyticsEventsBlocks('courses', payload.ga4, ctx),
  );

  return out;
}

function resourcesTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [];

  out.push(
    ...dbTotalsGrid(payload, ctx, [
      'resourcesStarted',
      'resourcesCompleted',
      'resourceFeedbackSubmitted',
    ]),
  );

  if (!ctx.withDetail) return out;

  out.push(
    ...resourceBreakdownBlocks(payload.dbBreakdowns, ctx),
    ...condensedTagBlocks('Resource feedback by tag', payload.dbBreakdowns?.resourceFeedbackByTag),
    ...analyticsEventsBlocks('resources', payload.ga4, ctx),
  );

  return out;
}

function therapyTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [];

  out.push(
    ...dbTotalsGrid(payload, ctx, [
      'therapyBookingsBooked',
      'therapySessionsCompleted',
      'therapyBookingsCancelled',
    ]),
  );

  if (!ctx.withDetail) return out;

  out.push(
    ...namedBreakdownsBlocks(ctx, [
      { label: 'Therapy by therapist', rows: payload.dbBreakdowns?.therapyByTherapist },
      { label: 'Therapy by partner', rows: payload.dbBreakdowns?.therapyByPartner },
    ]),
    ...analyticsEventsBlocks('therapy', payload.ga4, ctx),
  );

  return out;
}

function communicationsTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [];

  // DB-authoritative chat counts (event_log) lead — GA chat events follow as
  // supplementary engagement signal under analytics events.
  out.push(
    ...dbTotalsGrid(payload, ctx, [
      'messagesSent',
      'messagesReceived',
      'whatsappSubscribed',
      'whatsappUnsubscribed',
    ]),
  );

  if (!ctx.withDetail) return out;

  out.push(...analyticsEventsBlocks('communications', payload.ga4, ctx));

  return out;
}

function appTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  const out: Block[] = [];

  // GA traffic shape (active users, new users, sessions, pageviews). DB-side
  // user cohort metrics live under the Users topic.
  const gaCells = ga4OverviewCells(payload, ctx);
  if (gaCells.length > 0) {
    out.push(...kpiGrid(gaCells, { title: '*Analytics traffic*' }));
  }

  out.push(
    ...analyticsEventsBlocks('app', payload.ga4, ctx),
    ...globalBreakdownsBlocks(payload.ga4),
  );

  return out;
}

function navigationTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  return analyticsEventsBlocks('navigation', payload.ga4, ctx);
}

function adminTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  return analyticsEventsBlocks('admin', payload.ga4, ctx);
}

function errorsTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  return analyticsEventsBlocks('errors', payload.ga4, ctx);
}

/** DB period counts grid. Untitled — DB totals lead every topic body, so
 *  position alone communicates the data source. */
function dbTotalsGrid(
  payload: ReportPayload,
  ctx: RenderContext,
  keys: ReadonlyArray<keyof DbMetrics>,
): Block[] {
  const cells = dbCells(payload, ctx, keys);
  if (cells.length === 0) return [];
  return kpiGrid(cells);
}

/** Per-topic Analytics events grid. Flattens every EventGroup.lines for the
 *  topic into one 2-col grid (single cell per EventLine). Drops zero-only
 *  lines so a clean period yields a slim section. Single-event lines pass a
 *  baseline through to the standard cell renderer; multi-event composite
 *  lines fold the line-total delta into their composite string. */
function analyticsEventsBlocks(topic: EventTopic, ga4: Ga4Metrics, ctx: RenderContext): Block[] {
  if ('unavailable' in ga4.events) return [];
  const counts = indexEventsByName(ga4.events);
  const eventBaselines = ctx.baseline?.ga4Events ?? {};
  const breakdownIdx = indexEventBreakdowns(ga4.eventBreakdowns);
  const groups = EVENT_GROUPS.filter((g) => g.topic === topic);
  const cells: GridCell[] = [];

  for (const group of groups) {
    for (const line of group.lines) {
      const lineCounts = line.items.map((item) => ({
        label: item.label,
        event: item.event,
        count: counts.get(item.event) ?? 0,
      }));
      const nonZero = lineCounts.filter((i) => i.count > 0);
      if (nonZero.length === 0) continue;

      const baseline = sumLineBaseline(
        line.items.map((i) => i.event),
        eventBaselines,
      );
      const subline = buildEventBreakdownSubline(line, breakdownIdx);

      if (nonZero.length === 1 && line.items.length === 1) {
        cells.push({ label: line.label, value: nonZero[0].count, baseline, subline });
      } else {
        const composite = nonZero
          .map((i) => `${i.label} (${i.count.toLocaleString()})`)
          .join(' · ');
        const lineCurrent = nonZero.reduce((s, i) => s + i.count, 0);
        const delta = formatDelta(lineCurrent, baseline, 0, ctx.deltaBaselineFloor);
        const arrowValue = delta ? `${composite}  ·  ${delta}` : composite;
        cells.push({
          label: line.label,
          value: 0,
          _arrowValue: arrowValue,
          subline,
        } as GridCell & { _arrowValue: string });
      }
    }
  }

  if (cells.length === 0) return [];
  return gridWithHeader('*Analytics events*', cells);
}

/** Look up the GA4 custom-dim breakdown for an event line and format it as a
 *  compact `↳ <paramLabel>: A (n) · B (n) · C (n)` sub-row. Top 3 only —
 *  more makes the grid cell tall enough to break the two-column layout.
 *  Returns undefined when the line has no breakdown config or GA returned
 *  zero rows. */
function buildEventBreakdownSubline(
  line: EventLine,
  idx: Map<string, Ga4EventBreakdown>,
): string | undefined {
  if (!line.breakdownParam || !line.paramLabel) return undefined;
  const bd = idx.get(`${line.label}::${line.breakdownParam}`);
  if (!bd || bd.rows.length === 0) return undefined;
  const top = bd.rows
    .slice(0, 3)
    .map((r) => `${truncate(r.value || '(unknown)', 20)} (${r.eventCount.toLocaleString()})`)
    .join(' · ');
  return `↳ ${line.paramLabel}: ${top}`;
}

function indexEventBreakdowns(breakdowns: Ga4EventBreakdown[]): Map<string, Ga4EventBreakdown> {
  const m = new Map<string, Ga4EventBreakdown>();
  for (const b of breakdowns) m.set(`${b.lineLabel}::${b.paramApiName}`, b);
  return m;
}

/** Sum per-event baselines into a single line-level baseline. By linearity
 *  of expectation, sum(means) = mean(sums), so the line delta against the
 *  summed baseline matches the conceptual "this line vs. its historical
 *  total". Events without a baseline contribute nothing. Returns undefined
 *  if no contributing event had a baseline. */
function sumLineBaseline(
  events: string[],
  byEvent: Record<string, BaselineStat>,
): BaselineStat | undefined {
  let mean = 0;
  let sampleSize = 0;
  let any = false;
  for (const event of events) {
    const b = byEvent[event];
    if (!b) continue;
    mean += b.mean;
    sampleSize = Math.max(sampleSize, b.sampleSize);
    any = true;
  }
  if (!any) return undefined;
  // stdDev isn't used by formatDelta (only by anomaly scoring, which operates
  // on per-event baselines directly). Set to a non-zero sentinel so any
  // future flat-baseline guards don't misfire on summed lines.
  return { mean, stdDev: 1, sampleSize };
}

function headerBlock(payload: ReportPayload): Block {
  const { period, window } = payload;
  const suffix = period === 'daily' ? `(${window.timezone})` : `(${formatDateRange(window)})`;
  const title = `Bloom ${period} digest — ${window.label} ${suffix}`;
  return { type: 'header', text: { type: 'plain_text', text: title } };
}

function contextBlock(payload: ReportPayload): Block {
  const { trigger, runId, baseline } = payload;
  const baselineDesc = baseline
    ? baseline.sampleSize === 1
      ? 'baseline: vs prior period'
      : `baseline: last ${baseline.sampleSize} periods`
    : null;
  const pieces = [
    `trigger: *${trigger}*`,
    `tz: ${payload.window.timezone}`,
    baselineDesc,
    runId ? `run: ${runId}` : null,
  ].filter(Boolean);
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: pieces.join(' · ') }],
  };
}

function dividerBlock(): Block {
  return { type: 'divider' };
}

function mrkdwnSection(text: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function topicHeader(topic: EventTopic): Block {
  const { emoji, title } = TOPIC_HEADINGS[topic];
  return mrkdwnSection(`*${emoji} ${title}*`);
}

/** Daily-only lighter title block. Keeps the date + tz inline so the context
 *  block underneath can drop the timezone repeat. Uses a section mrkdwn block
 *  instead of `header` so the visual weight is closer to a status line than
 *  a digest title — daily then reads as a "snapshot" against the heavier
 *  weekly+ digests in the same Slack channel. */
function dailyTitleBlock(payload: ReportPayload): Block {
  return mrkdwnSection(
    `*Bloom daily snapshot* — ${payload.window.label} (${payload.window.timezone})`,
  );
}

function gaUnavailableBanner(payload: ReportPayload): Block | null {
  const overviewOut = 'unavailable' in payload.ga4.overview;
  const eventsOut = 'unavailable' in payload.ga4.events;
  if (!overviewOut && !eventsOut) return null;
  const reason =
    'unavailable' in payload.ga4.events
      ? payload.ga4.events.reason
      : 'unavailable' in payload.ga4.overview
        ? payload.ga4.overview.reason
        : 'unknown';
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `:warning: _Analytics events unavailable this period — ${reason}. Database totals are unaffected._`,
      },
    ],
  };
}

function headlineSection(payload: ReportPayload, ctx: RenderContext): Block[] {
  const db = payload.db;
  const dbCell = (key: keyof DbMetrics): GridCell => ({
    label: DB_METRIC_LABELS[key],
    value: db[key],
    baseline: ctx.baseline?.db[key],
  });

  // Daily trims to a 6-cell scoreboard so the snapshot stays short on a
  // low-traffic site. Weekly+ keeps the wider acquisition / retention /
  // engagement / chat surface — its denser format is the whole point of the
  // longer-cadence digest. Both bounded by Slack's 10 fields-per-section cap.
  const keys: ReadonlyArray<keyof DbMetrics> =
    ctx.period === 'daily'
      ? DAILY_HEADLINE_KEYS
      : [
          'newUsers',
          'newPartnerUsers',
          'deletedUsers',
          'activeUsers',
          'coursesStarted',
          'sessionsStarted',
          'resourcesStarted',
          'therapySessionsCompleted',
          'messagesSent',
          'whatsappSubscribed',
        ];
  const cells = keys.map(dbCell);

  return [...kpiGrid(cells, { deltaBaselineFloor: ctx.deltaBaselineFloor })];
}

function anomaliesSection(anomalies: Anomaly[], baseline: ReportBaseline | undefined): Block[] {
  // Synthetic baselines (sampleSize === 1) say "prior" instead of "avg" so
  // the wording matches the cell-level deltas everywhere else.
  const refWord = baseline?.sampleSize === 1 ? 'prior' : 'avg';
  const cells: GridCell[] = anomalies.map((a) => {
    const source = a.source === 'db' ? 'DB' : 'GA';
    // Outage-watchlist sentinel: ReportingService emits sigma === 0 for
    // "today=0 but normally non-zero" anomalies. Render as a plain-English
    // outage hint rather than a percent delta — `↓ 100% vs avg N` would be
    // technically correct but lose the "tracking down?" intent.
    if (a.sigma === 0 && a.current === 0) {
      const expected = formatNumber(a.mean);
      return {
        label: `${a.label} (${source})`,
        value: a.current,
        _arrowValue: `0  ·  expected ~${expected} — tracking down?`,
      } as GridCell & { _arrowValue: string };
    }
    const arrow = a.sigma > 0 ? '↑' : '↓';
    const ref = formatNumber(a.mean);
    const delta =
      a.mean === 0
        ? `${arrow} vs ${refWord} 0 (z=${a.sigma.toFixed(1)})`
        : `${arrow} ${Math.abs(Math.round(((a.current - a.mean) / a.mean) * 100))}% vs ${refWord} ${ref}`;
    return {
      label: `${a.label} (${source})`,
      value: a.current,
      _arrowValue: `${a.current.toLocaleString()}  ·  ${delta}`,
    } as GridCell & { _arrowValue: string };
  });
  const header = baseline
    ? baseline.sampleSize === 1
      ? '*:mag: Worth looking at* _(vs prior period)_'
      : `*:mag: Worth looking at* _(vs last ${baseline.sampleSize}-period baseline)_`
    : '*:mag: Worth looking at*';
  return gridWithHeader(header, cells);
}

interface KpiGridOptions {
  suppressDelta?: boolean;
  /** Optional mrkdwn text rendered above the first row (text + fields in one block). */
  title?: string;
  /** Per-period delta floor; below this baseline mean, the `↑/↓ X%` text is
   *  suppressed. Defaults to the strict weekly+ floor when omitted. */
  deltaBaselineFloor?: number;
}

/** Weekly+ default — kept here as a fallback so existing callers that don't
 *  thread a per-period floor through KpiGridOptions still get sensible
 *  noise suppression. Daily passes its own (looser) floor explicitly. */
const DEFAULT_DELTA_BASELINE_FLOOR = 5;

function kpiGrid(cells: GridCell[], opts: KpiGridOptions = {}): Block[] {
  const blocks: Block[] = [];
  const floor = opts.deltaBaselineFloor ?? DEFAULT_DELTA_BASELINE_FLOOR;
  for (let i = 0; i < cells.length; i += FIELDS_PER_SECTION) {
    const slice = cells.slice(i, i + FIELDS_PER_SECTION);
    const fields = slice.map((cell) => ({
      type: 'mrkdwn',
      text: formatGridCell(cell, opts.suppressDelta === true, floor),
    }));
    if (i === 0 && opts.title) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: opts.title }, fields });
    } else {
      blocks.push({ type: 'section', fields });
    }
  }
  return blocks;
}

function formatGridCell(cell: GridCell, suppressDelta: boolean, floor: number): string {
  if (cell.value === null) return withSubline(`*${cell.label}*\nN/A`, cell.subline);
  const value = formatNumber(cell.value, cell.decimals ?? 0);
  if (suppressDelta) return withSubline(`*${cell.label}*\n${value}`, cell.subline);
  const delta = formatDelta(cell.value, cell.baseline, cell.decimals ?? 0, floor);
  const head = delta ? `*${cell.label}*\n${value}  ·  ${delta}` : `*${cell.label}*\n${value}`;
  return withSubline(head, cell.subline);
}

function withSubline(text: string, subline: string | undefined): string {
  return subline ? `${text}\n${subline}` : text;
}

function formatDelta(
  current: number,
  baseline: BaselineStat | undefined,
  decimals: number,
  floor: number,
): string | null {
  if (!baseline) return null;
  // Below the small-counts floor: %-swings are dominated by noise. Drop the
  // delta entirely rather than show a misleading number.
  if (baseline.mean < floor) return null;
  // Render the baseline mean at the same precision as the cell value so the
  // two numbers on the same line never disagree about how many decimals
  // matter for this metric.
  const ref = formatNumber(baseline.mean, decimals);
  const refWord = baseline.sampleSize === 1 ? 'prior' : 'avg';
  const pct = Math.round(((current - baseline.mean) / baseline.mean) * 100);
  if (pct === 0) return `${refWord} ${ref}`;
  const arrow = pct > 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(pct)}% vs ${refWord} ${ref}`;
}

function dbCells(
  payload: ReportPayload,
  ctx: RenderContext,
  keys: ReadonlyArray<keyof DbMetrics>,
): GridCell[] {
  const db = payload.db;
  return keys
    .map(
      (key): GridCell => ({
        label: DB_METRIC_LABELS[key],
        value: db[key],
        baseline: ctx.baseline?.db[key],
      }),
    )
    .filter((cell) => !isFlatlineZero(cell));
}

function ga4OverviewCells(payload: ReportPayload, ctx: RenderContext): GridCell[] {
  const ov = payload.ga4.overview;
  if ('unavailable' in ov) return [];
  return (Object.keys(GA4_OVERVIEW_LABELS) as Array<keyof Ga4OverviewMetrics>)
    .map(
      (key): GridCell => ({
        label: GA4_OVERVIEW_LABELS[key],
        value: ov[key],
        baseline: ctx.baseline?.ga4Overview[key],
        decimals: key === 'averageSessionDuration' ? 1 : 0,
      }),
    )
    .filter((cell) => !isFlatlineZero(cell));
}

/** A cell is "flatline zero" when current is 0 AND every baselined prior was
 *  also 0 — never had activity. Hides permanent noise without suppressing a
 *  genuine zero against a non-zero baseline. */
function isFlatlineZero(cell: GridCell): boolean {
  if (cell.value !== 0) return false;
  const b = cell.baseline;
  return b !== undefined && b.mean === 0 && b.stdDev === 0;
}

function courseBreakdownBlocks(b: DbBreakdowns | undefined, ctx: RenderContext): Block[] {
  if (!b || b.courses.length === 0) return [];
  const cap = ctx.uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;

  const courseRows = b.courses
    .filter((c) => c.coursesStarted > 0 || c.coursesCompleted > 0)
    .map((c) => ({
      name: stripSubtitle(c.name),
      started: c.coursesStarted,
      completed: c.coursesCompleted,
    }));

  const sessionRows: Array<{ name: string; started: number; completed: number }> = [];
  for (const c of b.courses) {
    const courseName = stripSubtitle(c.name);
    for (const s of c.sessions) {
      if (s.started === 0 && s.completed === 0) continue;
      sessionRows.push({
        name: `${courseName}: ${stripSubtitle(s.name)}`,
        started: s.started,
        completed: s.completed,
      });
    }
  }
  sessionRows.sort(
    (a, b) => b.completed - a.completed || b.started - a.started || a.name.localeCompare(b.name),
  );

  const out: Block[] = [];
  if (courseRows.length > 0) {
    out.push(...startedCompletedGrid('*Courses*', courseRows, cap));
  }
  if (sessionRows.length > 0) {
    out.push(...startedCompletedGrid('*Sessions*', sessionRows, cap));
  }
  return out;
}

function resourceBreakdownBlocks(b: DbBreakdowns | undefined, ctx: RenderContext): Block[] {
  if (!b || b.resources.length === 0) return [];
  const cap = ctx.uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;

  const rows: Array<{ name: string; started: number; completed: number }> = [];
  for (const cat of b.resources) {
    const catLabel = RESOURCE_CATEGORY_LABELS[cat.category] ?? cat.category;
    for (const r of cat.resources) {
      if (r.started === 0 && r.completed === 0) continue;
      rows.push({
        name: `${catLabel}: ${stripSubtitle(r.name)}`,
        started: r.started,
        completed: r.completed,
      });
    }
  }
  rows.sort(
    (a, b) => b.completed - a.completed || b.started - a.started || a.name.localeCompare(b.name),
  );

  if (rows.length === 0) return [];
  return startedCompletedGrid('*Resources*', rows, cap);
}

function startedCompletedGrid(
  title: string,
  rows: ReadonlyArray<{ name: string; started: number; completed: number }>,
  cap: number,
): Block[] {
  const shown = Number.isFinite(cap) ? rows.slice(0, cap) : rows;
  const cells: Array<GridCell & { _arrowValue?: string }> = shown.map((r) => ({
    // Full names — truncating these to 36 chars was hiding the `: SessionName`
    // half of session labels under long course titles, making the Sessions
    // grid visually indistinguishable from the Courses grid above it.
    label: r.name,
    value: r.started,
    _arrowValue: `${r.started.toLocaleString()} started · ${r.completed.toLocaleString()} completed`,
  }));
  const remaining = rows.length - shown.length;
  if (remaining > 0) {
    cells.push({ label: `+${remaining} more`, value: 0, _arrowValue: '…' });
  }
  return gridWithHeader(title, cells);
}

function formatBreakdownCellArrow(cell: GridCell): string | null {
  const arrow = (cell as { _arrowValue?: string })._arrowValue;
  if (!arrow) return null;
  return withSubline(`*${cell.label}*\n${arrow}`, cell.subline);
}

function gridWithHeader(headerText: string, cells: GridCell[]): Block[] {
  if (cells.length === 0) {
    return [mrkdwnSection(headerText)];
  }
  const blocks: Block[] = [];
  for (let i = 0; i < cells.length; i += FIELDS_PER_SECTION) {
    const slice = cells.slice(i, i + FIELDS_PER_SECTION);
    const fields = slice.map((cell) => ({
      type: 'mrkdwn',
      // Suppress-delta path — floor is unused but the formatter takes one.
      text:
        formatBreakdownCellArrow(cell) ?? formatGridCell(cell, true, DEFAULT_DELTA_BASELINE_FLOOR),
    }));
    blocks.push(
      i === 0
        ? { type: 'section', text: { type: 'mrkdwn', text: headerText }, fields }
        : { type: 'section', fields },
    );
  }
  return blocks;
}

interface BreakdownSpec {
  label: string;
  rows: DbNamedCount[] | undefined;
}

/** Render each spec as a single condensed line: `*Label* name (n) · name (n) · …`.
 *  The named-count rows here (partner, language, therapist) all have short
 *  values, so a one-line `tag (n)` chain is denser AND more readable than
 *  the previous one-cell-per-row grid. Matches the format used by
 *  `condensedTagBlocks` so the Users & accounts / Therapy sections feel
 *  consistent with the analytics-events composite lines elsewhere. */
function namedBreakdownsBlocks(ctx: RenderContext, specs: BreakdownSpec[]): Block[] {
  const cap = ctx.uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;
  const out: Block[] = [];
  for (const spec of specs) {
    if (!spec.rows || spec.rows.length === 0) continue;
    const shown = Number.isFinite(cap) ? spec.rows.slice(0, cap) : spec.rows;
    const composite = shown
      .map((r) => `${r.name || '(unknown)'} (${r.count.toLocaleString()})`)
      .join(' · ');
    const remaining = spec.rows.length - shown.length;
    const tail = remaining > 0 ? `  _+${remaining} more_` : '';
    out.push(mrkdwnSection(`*${spec.label}*\n${composite}${tail}`));
  }
  return out;
}

/** Tag breakdowns render as a single condensed line — `tag (n) · tag (n) · …`
 *  on one section block. Keeps high-cardinality lists compact instead of
 *  inflating to one cell per tag. */
function condensedTagBlocks(label: string, rows: DbNamedCount[] | undefined): Block[] {
  if (!rows || rows.length === 0) return [];
  const shown = rows.slice(0, CONDENSED_NAMED_LIMIT);
  const composite = shown
    .map((r) => `${truncate(r.name || '(unknown)', 24)} (${r.count.toLocaleString()})`)
    .join(' · ');
  const remaining = rows.length - shown.length;
  const tail = remaining > 0 ? `  _+${remaining} more_` : '';
  return [mrkdwnSection(`*${label}*\n${composite}${tail}`)];
}

function indexEventsByName(events: Ga4EventTotal[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) m.set(e.eventName, e.eventCount);
  return m;
}

function globalBreakdownsBlocks(ga4: Ga4Metrics): Block[] {
  const populated = ga4.breakdowns.filter((b) => b.rows.length > 0);
  if (populated.length === 0) return [];
  const cells: GridCell[] = populated.map((b) => {
    const composite = b.rows
      .slice(0, 5)
      .map((r) => `${truncate(r.value || '(unknown)', 28)} (${r.eventCount.toLocaleString()})`)
      .join(' · ');
    return {
      label: b.displayName,
      value: 0,
      _arrowValue: composite,
    } as GridCell & { _arrowValue: string };
  });
  return gridWithHeader('*Top traffic*', cells);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Storyblok titles often carry a `Title: longer subtitle` suffix that bloats
 *  the breakdown grid without adding signal at the report level. Keep only
 *  the part before the first colon; fall back to `(unnamed)` for empty/
 *  null inputs so the cell still has a label. */
function stripSubtitle(name: string | null | undefined): string {
  const raw = (name ?? '').trim();
  if (!raw) return '(unnamed)';
  const head = raw.split(':', 1)[0].trim();
  return head || '(unnamed)';
}

function formatDateRange(window: ReportWindow): string {
  // Format in the window's timezone — `window.from` is the UTC instant of
  // local-midnight, which under BST is the prior UTC day. Using toISOString
  // here would render the start date one day early.
  const fmt = (d: Date) => DateTime.fromJSDate(d, { zone: window.timezone }).toFormat('yyyy-LL-dd');
  return `${fmt(window.from)} → ${fmt(window.to)}`;
}

function formatNumber(n: number, decimals = 0): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
}
