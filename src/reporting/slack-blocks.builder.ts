import { SLACK_BLOCK_SAFETY_MARGIN } from './reporting.constants';
import { EVENT_GROUPS, EventGroup, EventLine, EventTopic } from './reporting.events';
import { FUNNELS } from './reporting.funnels';
import {
  Anomaly,
  BaselineStat,
  DB_METRIC_LABELS,
  DB_TOTALS_LABELS,
  DbBreakdowns,
  DbMetrics,
  DbNamedCount,
  DbTotals,
  GA4_OVERVIEW_LABELS,
  Ga4Breakdown,
  Ga4EventBreakdown,
  Ga4EventTotal,
  Ga4Metrics,
  Ga4OverviewMetrics,
  PERIODS_WITH_FULL_DETAIL,
  PERIODS_WITH_TOTALS,
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

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  short_video: 'Short videos',
  single_video: 'Single videos',
  conversation: 'Conversations',
};

type Block = Record<string, unknown>;

interface GridCell {
  label: string;
  value: number;
  baseline?: BaselineStat;
  decimals?: number;
}

interface RenderContext {
  period: ReportPeriod;
  withDetail: boolean;
  uncapped: boolean;
  baseline?: ReportBaseline;
}

export function buildReportBlocks(payload: ReportPayload): Block[] {
  const ctx: RenderContext = {
    period: payload.period,
    withDetail: PERIODS_WITH_FULL_DETAIL.includes(payload.period),
    uncapped: PERIODS_WITH_UNCAPPED_BREAKDOWNS.includes(payload.period),
    baseline: payload.baseline,
  };

  const blocks: Block[] = [];
  blocks.push(headerBlock(payload));
  blocks.push(contextBlock(payload));

  const anomalies = payload.anomalies ?? [];
  if (anomalies.length > 0) {
    blocks.push(dividerBlock());
    blocks.push(...anomaliesSection(anomalies, ctx.baseline));
  }

  for (const topic of TOPIC_ORDER) {
    const out = renderTopic(topic, payload, ctx);
    if (out.length > 0) {
      blocks.push(dividerBlock());
      blocks.push(...out);
    }
  }

  // State-of-Bloom closing capstone — renders below per-topic sections so the
  // top of the message is "what changed this period" and the bottom is
  // "where we stand overall". Quarterly + yearly only.
  if (payload.dbTotals && PERIODS_WITH_TOTALS.includes(payload.period)) {
    blocks.push(dividerBlock());
    blocks.push(...totalsSection(payload.dbTotals));
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

// ---------- topic dispatch ----------

const TOPIC_ORDER: EventTopic[] = [
  'users',
  'courses',
  'resources',
  'therapy',
  'messaging',
  'communications',
  'app',
  'navigation',
  'promo',
  'admin',
  'errors',
];

const TOPIC_HEADINGS: Record<EventTopic, { emoji: string; title: string }> = {
  users: { emoji: ':bust_in_silhouette:', title: 'Users & accounts' },
  courses: { emoji: ':books:', title: 'Courses & sessions' },
  resources: { emoji: ':headphones:', title: 'Resources' },
  therapy: { emoji: ':speech_balloon:', title: 'Therapy' },
  messaging: { emoji: ':left_speech_bubble:', title: 'Messaging' },
  communications: { emoji: ':inbox_tray:', title: 'Communications' },
  app: { emoji: ':iphone:', title: 'App & traffic' },
  navigation: { emoji: ':compass:', title: 'Navigation & engagement' },
  promo: { emoji: ':loudspeaker:', title: 'Promo & banners' },
  admin: { emoji: ':gear:', title: 'Admin activity' },
  errors: { emoji: ':rotating_light:', title: 'Errors' },
};

function renderTopic(
  topic: EventTopic,
  payload: ReportPayload,
  ctx: RenderContext,
): Block[] {
  switch (topic) {
    case 'users':
      return usersTopic(payload, ctx);
    case 'courses':
      return coursesTopic(payload, ctx);
    case 'resources':
      return resourcesTopic(payload, ctx);
    case 'therapy':
      return therapyTopic(payload, ctx);
    case 'messaging':
      return messagingTopic(payload, ctx);
    case 'communications':
      return communicationsTopic(payload, ctx);
    case 'app':
      return appTopic(payload, ctx);
    case 'navigation':
      return navigationTopic(payload, ctx);
    case 'promo':
      return promoTopic(payload, ctx);
    case 'admin':
      return adminTopic(payload, ctx);
    case 'errors':
      return errorsTopic(payload, ctx);
  }
}

// ---------- topic: users ----------

function usersTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [topicHeader('users')];

  const dbGrid = dbCells(payload, ctx, [
    'newUsers',
    'deletedUsers',
    'partnerAccessGrants',
    'partnerAccessActivations',
    'activationRate',
    'partnerActivationRate',
  ]);
  if (dbGrid.length > 0) out.push(...kpiGrid(dbGrid));

  // GA4 overview lives here — it's primarily user-traffic.
  const gaCells = ga4OverviewCells(payload, ctx);
  if (gaCells.length > 0) out.push(...kpiGrid(gaCells));

  if (!ctx.withDetail) return out;

  appendNarrative(out, [
    collectBreakdownLines(payload.dbBreakdowns, ctx, [
      { label: 'New users by partner (DB)', rows: payload.dbBreakdowns?.newUsersByPartner },
      { label: 'New users by signup language (DB)', rows: payload.dbBreakdowns?.newUsersByLanguage },
      { label: 'Partner-access grants by partner (DB)', rows: payload.dbBreakdowns?.partnerAccessGrantsByPartner },
      { label: 'Partner-access activations by partner (DB)', rows: payload.dbBreakdowns?.partnerAccessActivationsByPartner },
    ]),
    funnelLinesFor(payload.ga4, ['Signup flow', 'Partner code flow', 'Login funnel']),
    renderTopicEventGroups('users', payload.ga4, ctx),
  ]);

  return out;
}

// ---------- topic: courses ----------

function coursesTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [topicHeader('courses')];

  const dbGrid = dbCells(payload, ctx, [
    'coursesStarted',
    'coursesCompleted',
    'sessionsStarted',
    'sessionsCompleted',
    'sessionFeedbackSubmitted',
  ]);
  if (dbGrid.length > 0) out.push(...kpiGrid(dbGrid));

  if (!ctx.withDetail) return out;

  appendNarrative(out, [
    renderCourseBreakdowns(payload.dbBreakdowns, ctx.uncapped),
    collectBreakdownLines(payload.dbBreakdowns, ctx, [
      { label: 'Session feedback by tag (DB)', rows: payload.dbBreakdowns?.sessionFeedbackByTag },
    ]),
    funnelLinesFor(payload.ga4, ['Course flow', 'Session flow']),
    renderTopicEventGroups('courses', payload.ga4, ctx),
  ]);

  return out;
}

// ---------- topic: resources (mirrors courses topic structure) ----------

function resourcesTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [topicHeader('resources')];

  const dbGrid = dbCells(payload, ctx, [
    'resourcesStarted',
    'resourcesCompleted',
    'resourceFeedbackSubmitted',
  ]);
  if (dbGrid.length > 0) out.push(...kpiGrid(dbGrid));

  if (!ctx.withDetail) return out;

  appendNarrative(out, [
    renderResourceBreakdowns(payload.dbBreakdowns, ctx.uncapped),
    collectBreakdownLines(payload.dbBreakdowns, ctx, [
      { label: 'Resource feedback by tag (DB)', rows: payload.dbBreakdowns?.resourceFeedbackByTag },
    ]),
    funnelLinesFor(payload.ga4, [
      'Resource short video flow',
      'Resource single video flow',
      'Resource conversation flow',
    ]),
    renderTopicEventGroups('resources', payload.ga4, ctx),
  ]);

  return out;
}

// ---------- topic: therapy ----------

function therapyTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [topicHeader('therapy')];

  const dbGrid = dbCells(payload, ctx, [
    'therapyBookingsBooked',
    'therapyBookingsCancelled',
    'therapyBookingsScheduledForPeriod',
  ]);
  if (dbGrid.length > 0) out.push(...kpiGrid(dbGrid));

  if (!ctx.withDetail) return out;

  appendNarrative(out, [
    collectBreakdownLines(payload.dbBreakdowns, ctx, [
      { label: 'Therapy by therapist (DB)', rows: payload.dbBreakdowns?.therapyByTherapist },
      { label: 'Therapy by partner (DB)', rows: payload.dbBreakdowns?.therapyByPartner },
    ]),
    funnelLinesFor(payload.ga4, ['Therapy flow', 'Therapy cancellation flow']),
    renderTopicEventGroups('therapy', payload.ga4, ctx),
  ]);

  return out;
}

// ---------- topic: messaging ----------

function messagingTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  // No DB grid — chat send/compose isn't persisted by Crisp.
  if (!ctx.withDetail) return [];
  const eventDetail = renderTopicEventGroups('messaging', payload.ga4, ctx);
  if (!eventDetail) return [];
  return [topicHeader('messaging'), mrkdwnSection(eventDetail)];
}

// ---------- topic: communications ----------

function communicationsTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  const out: Block[] = [topicHeader('communications')];

  const dbGrid = dbCells(payload, ctx, [
    'whatsappSubscribed',
    'whatsappUnsubscribed',
  ]);
  if (dbGrid.length > 0) out.push(...kpiGrid(dbGrid));

  if (!ctx.withDetail) return out;

  appendNarrative(out, [
    funnelLinesFor(payload.ga4, ['WhatsApp subscribe flow']),
    renderTopicEventGroups('communications', payload.ga4, ctx),
  ]);

  return out;
}

// ---------- topic: app ----------

function appTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  const out: Block[] = [topicHeader('app')];

  // Top pages / sources / device / country render here as traffic-shape signals.
  appendNarrative(out, [
    funnelLinesFor(payload.ga4, ['PWA install flow']),
    renderTopicEventGroups('app', payload.ga4, ctx),
    renderGlobalBreakdownsInline(payload.ga4),
  ]);

  return out.length > 1 ? out : [];
}

// ---------- topic: navigation ----------

function navigationTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  const eventDetail = renderTopicEventGroups('navigation', payload.ga4, ctx);
  if (!eventDetail) return [];
  return [topicHeader('navigation'), mrkdwnSection(eventDetail)];
}

// ---------- topic: promo ----------

function promoTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  const eventDetail = renderTopicEventGroups('promo', payload.ga4, ctx);
  if (!eventDetail) return [];
  return [topicHeader('promo'), mrkdwnSection(eventDetail)];
}

// ---------- topic: admin ----------

function adminTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  if (!ctx.withDetail) return [];
  const eventDetail = renderTopicEventGroups('admin', payload.ga4, ctx);
  if (!eventDetail) return [];
  return [topicHeader('admin'), mrkdwnSection(eventDetail)];
}

// ---------- topic: errors ----------

function errorsTopic(payload: ReportPayload, ctx: RenderContext): Block[] {
  // Always-on across cadences; errorsOnly groups already drop zero rows.
  const eventDetail = renderTopicEventGroups('errors', payload.ga4, ctx, {
    omitDetailHeading: true,
  });
  if (!eventDetail) return [];
  return [topicHeader('errors'), mrkdwnSection(eventDetail)];
}

/** Combine breakdowns + flows + detail into a single mrkdwn block per topic
 *  to stay under Slack's 50-block message limit. */
function appendNarrative(out: Block[], parts: Array<string | null>): void {
  const joined = parts.filter((p): p is string => Boolean(p)).join('\n\n');
  if (joined) out.push(mrkdwnSection(joined));
}

// ---------- header / context / divider ----------

function headerBlock(payload: ReportPayload): Block {
  const { period, window } = payload;
  const suffix =
    period === 'daily' ? `(${window.timezone})` : `(${formatDateRange(window)})`;
  const title = `Bloom ${period} digest — ${window.label} ${suffix}`;
  return { type: 'header', text: { type: 'plain_text', text: title } };
}

function contextBlock(payload: ReportPayload): Block {
  const { trigger, runId, baseline } = payload;
  const pieces = [
    `trigger: *${trigger}*`,
    `tz: ${payload.window.timezone}`,
    baseline ? `baseline: last ${baseline.sampleSize} periods` : null,
    runId ? `run: ${runId}` : null,
  ].filter(Boolean);
  return {
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: pieces.join(' · ') },
      {
        type: 'mrkdwn',
        text: '_DB = source of truth · Analytics events supplement where the DB has no equivalent_',
      },
    ],
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

// ---------- anomalies ----------

function anomaliesSection(
  anomalies: Anomaly[],
  baseline: ReportBaseline | undefined,
): Block[] {
  const lines = anomalies.map((a) => {
    const arrow = a.sigma > 0 ? '↑' : '↓';
    const qualitative = a.sigma > 0 ? 'unusually high' : 'unusually low';
    const avg = formatNumber(a.mean);
    const sourceLabel = a.source === 'db' ? 'DB' : 'GA';
    // mean === 0 → percent is undefined; fall back to z-score.
    const delta =
      a.mean === 0
        ? `${arrow} vs avg 0 (z=${a.sigma.toFixed(1)})`
        : `${arrow} ${Math.abs(Math.round(((a.current - a.mean) / a.mean) * 100))}% vs avg ${avg}`;
    return `• *${a.label}* (${sourceLabel}) — ${a.current.toLocaleString()} (${delta}, ${qualitative})`;
  });
  const header = baseline
    ? `*:rotating_light: Worth looking at* _(vs last ${baseline.sampleSize}-period baseline)_`
    : '*:rotating_light: Worth looking at*';
  return [mrkdwnSection(`${header}\n${lines.join('\n')}`)];
}

// ---------- Bloom totals ----------

function totalsSection(totals: DbTotals): Block[] {
  // Cumulative counters, not period rates — no baseline applies.
  const cells: GridCell[] = (Object.keys(DB_TOTALS_LABELS) as Array<keyof DbTotals>).map(
    (key) => ({ label: DB_TOTALS_LABELS[key], value: totals[key] }),
  );
  return [
    mrkdwnSection('*:cherry_blossom: Bloom totals* _(state of Bloom — cumulative)_'),
    ...kpiGrid(cells, { suppressDelta: true }),
  ];
}

// ---------- KPI grid renderer ----------

interface KpiGridOptions {
  /** Drop the third `delta` line — used for cumulative-snapshot grids. */
  suppressDelta?: boolean;
}

function kpiGrid(cells: GridCell[], opts: KpiGridOptions = {}): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < cells.length; i += FIELDS_PER_SECTION) {
    const slice = cells.slice(i, i + FIELDS_PER_SECTION);
    blocks.push({
      type: 'section',
      fields: slice.map((cell) => ({
        type: 'mrkdwn',
        text: formatGridCell(cell, opts.suppressDelta === true),
      })),
    });
  }
  return blocks;
}

function formatGridCell(cell: GridCell, suppressDelta: boolean): string {
  const value = formatNumber(cell.value, cell.decimals ?? 0);
  if (suppressDelta) return `*${cell.label}*\n${value}`;
  const delta = formatDelta(cell.value, cell.baseline);
  // Skip the third line entirely when no baseline exists — keeps cells at 2
  // rows and avoids `_no baseline_` noise on early runs and on periods that
  // don't yet have 3+ priors.
  return delta ? `*${cell.label}*\n${value}\n${delta}` : `*${cell.label}*\n${value}`;
}

/** Returns the delta line or `null` if there's no baseline to compare against. */
function formatDelta(current: number, baseline: BaselineStat | undefined): string | null {
  if (!baseline) return null;
  const avg = formatNumber(baseline.mean, baseline.mean % 1 === 0 ? 0 : 1);
  if (baseline.stdDev === 0 || baseline.mean === 0) {
    return `avg ${avg}`;
  }
  const pct = Math.round(((current - baseline.mean) / baseline.mean) * 100);
  if (pct === 0) return `avg ${avg}`;
  const arrow = pct > 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(pct)}% vs avg ${avg}`;
}

// ---------- DB cell helpers ----------

function dbCells(
  payload: ReportPayload,
  ctx: RenderContext,
  keys: ReadonlyArray<keyof DbMetrics>,
): GridCell[] {
  if ('unavailable' in payload.db) return [];
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
 *  also 0 — the metric has never had activity. Hiding removes permanent noise
 *  without suppressing a genuine zero against a non-zero baseline.
 *  Missing baseline → show the cell (can't tell flatline from new metric). */
function isFlatlineZero(cell: GridCell): boolean {
  if (cell.value !== 0) return false;
  const b = cell.baseline;
  return b !== undefined && b.mean === 0 && b.stdDev === 0;
}

// ---------- breakdowns: course + resource (existing nested format) ----------

function renderCourseBreakdowns(
  b: DbBreakdowns | undefined,
  uncapped: boolean,
): string | null {
  if (!b || b.courses.length === 0) return null;
  const cap = uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;
  const lines: string[] = ['*Courses & sessions (DB)*'];
  for (const course of b.courses) {
    lines.push(`• ${renderCourseHeader(course)}`);
    if (course.sessions.length > 0) {
      lines.push(`    ↳ ${renderStartedCompletedInline(course.sessions, cap)}`);
    }
  }
  return lines.join('\n');
}

function renderResourceBreakdowns(
  b: DbBreakdowns | undefined,
  uncapped: boolean,
): string | null {
  if (!b || b.resources.length === 0) return null;
  const cap = uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;
  const lines: string[] = ['*Resources (DB)*'];
  for (const cat of b.resources) {
    const label = RESOURCE_CATEGORY_LABELS[cat.category] ?? cat.category;
    const suffix =
      cat.resourcesStarted > 0 || cat.resourcesCompleted > 0
        ? ` — ${cat.resourcesStarted.toLocaleString()} started · ${cat.resourcesCompleted.toLocaleString()} completed`
        : '';
    lines.push(`• *${label}*${suffix}`);
    if (cat.resources.length > 0) {
      lines.push(`    ↳ ${renderStartedCompletedInline(cat.resources, cap)}`);
    }
  }
  return lines.join('\n');
}

function renderCourseHeader(course: DbBreakdowns['courses'][number]): string {
  // Explicit "N started · N completed" labels — self-describing regardless of
  // magnitude (completions can exceed starts when prior-period starts land
  // this period, which reads as a reversed funnel under arrow notation).
  const pieces: string[] = [];
  if (course.coursesStarted > 0 || course.coursesCompleted > 0) {
    pieces.push(
      `courses: ${course.coursesStarted.toLocaleString()} started · ${course.coursesCompleted.toLocaleString()} completed`,
    );
  }
  if (course.sessionsStarted > 0 || course.sessionsCompleted > 0) {
    pieces.push(
      `sessions: ${course.sessionsStarted.toLocaleString()} started · ${course.sessionsCompleted.toLocaleString()} completed`,
    );
  }
  const suffix = pieces.length > 0 ? ` — ${pieces.join(' · ')}` : '';
  return `*${truncate(course.name || '(unnamed)', 48)}*${suffix}`;
}

function renderStartedCompletedInline(
  children: Array<{ name: string; started: number; completed: number }>,
  cap: number,
): string {
  const shown = Number.isFinite(cap) ? children.slice(0, cap) : children;
  const formatted = shown
    .map(
      (c) =>
        `${truncate(c.name || '(unnamed)', 32)} (${c.started.toLocaleString()} started · ${c.completed.toLocaleString()} completed)`,
    )
    .join(' · ');
  const remaining = children.length - shown.length;
  return remaining > 0 ? `${formatted} · +${remaining} more` : formatted;
}

// ---------- breakdowns: generic { name, count } rows ----------

interface BreakdownSpec {
  label: string;
  rows: DbNamedCount[] | undefined;
}

/** Joins multiple `*Breakdowns*`-style lines into a single section block.
 *  Returns null if every row list is empty/undefined. */
function collectBreakdownLines(
  _breakdowns: DbBreakdowns | undefined,
  ctx: RenderContext,
  specs: BreakdownSpec[],
): string | null {
  const cap = ctx.uncapped ? Infinity : CHILDREN_CAP_PER_GROUP;
  const lines: string[] = ['*Breakdowns*'];
  let anyRows = false;
  for (const spec of specs) {
    if (!spec.rows || spec.rows.length === 0) continue;
    anyRows = true;
    lines.push(`• ${spec.label}: ${renderNamedCountInline(spec.rows, cap)}`);
  }
  return anyRows ? lines.join('\n') : null;
}

function renderNamedCountInline(rows: DbNamedCount[], cap: number): string {
  const shown = Number.isFinite(cap) ? rows.slice(0, cap) : rows;
  const formatted = shown
    .map((r) => `${truncate(r.name || '(unknown)', 32)} (${r.count.toLocaleString()})`)
    .join(' · ');
  const remaining = rows.length - shown.length;
  return remaining > 0 ? `${formatted} · +${remaining} more` : formatted;
}

// ---------- funnels (per-topic) ----------

function funnelLinesFor(ga4: Ga4Metrics, funnelLabels: string[]): string | null {
  if ('unavailable' in ga4.events) return null;
  const counts = indexEventsByName(ga4.events);
  const lines: string[] = [];
  for (const label of funnelLabels) {
    const funnel = FUNNELS.find((f) => f.label === label);
    if (!funnel) continue;
    const first = counts.get(funnel.steps[0].event) ?? 0;
    if (first === 0) continue;

    const parts = funnel.steps.map((step, i) => {
      const count = counts.get(step.event) ?? 0;
      if (i === 0) return `${step.label} ${count.toLocaleString()}`;
      const pct = Math.round((count / first) * 100);
      return `${step.label} ${count.toLocaleString()} (${pct}%)`;
    });
    lines.push(`• *${funnel.label}* — ${parts.join(' → ')}`);
  }
  if (lines.length === 0) return null;
  return `*Flows (Analytics events)*\n${lines.join('\n')}`;
}

// ---------- per-topic GA event detail ----------

interface RenderTopicEventOptions {
  /** Drop the `*Detail*` heading when event groups are the topic's only content. */
  omitDetailHeading?: boolean;
}

function renderTopicEventGroups(
  topic: EventTopic,
  ga4: Ga4Metrics,
  ctx: RenderContext,
  opts: RenderTopicEventOptions = {},
): string | null {
  if ('unavailable' in ga4.events) {
    return `_App activity for ${topic} unavailable — ${ga4.events.reason}_`;
  }
  const counts = indexEventsByName(ga4.events);
  const lineBreakdowns = ctx.withDetail
    ? indexEventBreakdowns(ga4.eventBreakdowns)
    : new Map<string, Ga4EventBreakdown>();

  const groups = EVENT_GROUPS.filter((g) => g.topic === topic);
  if (groups.length === 0) return null;

  const renderedGroups: string[] = [];
  for (const group of groups) {
    const rendered = renderGroup(group, counts, lineBreakdowns);
    if (rendered) renderedGroups.push(rendered);
  }
  if (renderedGroups.length === 0) return null;
  const body = renderedGroups.join('\n');
  return opts.omitDetailHeading ? body : `*Detail (Analytics events)*\n${body}`;
}

function renderGroup(
  group: EventGroup,
  counts: Map<string, number>,
  lineBreakdowns: Map<string, Ga4EventBreakdown>,
): string | null {
  const hideZeros = group.errorsOnly === true;
  const renderedLines = group.lines
    .map((line) => {
      const base = renderLine(line, counts, hideZeros);
      if (!base) return null;
      const sub = renderLineBreakdown(line, lineBreakdowns);
      return sub ? `${base}\n    ${sub}` : base;
    })
    .filter((l): l is string => l !== null);

  if (renderedLines.length === 0) return null;

  // Sub-group label (e.g. "Auth & onboarding"). Renders inside a topic
  // section — slightly visually nested via italics.
  return `_${group.title}_\n${renderedLines.join('\n')}`;
}

function renderLineBreakdown(
  line: EventLine,
  lineBreakdowns: Map<string, Ga4EventBreakdown>,
): string | null {
  if (!line.breakdownParam) return null;
  const key = `${line.label}::${line.breakdownParam}`;
  const bd = lineBreakdowns.get(key);
  if (!bd || bd.rows.length === 0) return null;
  const rows = bd.rows
    .slice(0, 3)
    .map((r) => `${truncate(r.value || '(unknown)', 32)} (${r.eventCount.toLocaleString()})`)
    .join(', ');
  return `↳ by ${bd.paramLabel}: ${rows}`;
}

function renderLine(
  line: EventLine,
  counts: Map<string, number>,
  hideZeros: boolean,
): string | null {
  const withCounts = line.items.map((item) => ({
    label: item.label,
    count: counts.get(item.event) ?? 0,
  }));

  const items = hideZeros ? withCounts.filter((i) => i.count > 0) : withCounts;
  if (items.length === 0) return null;

  if (line.items.length === 1) {
    return `• ${line.label} — ${items[0].count.toLocaleString()}`;
  }

  const inline = items.map((i) => `${i.label} (${i.count.toLocaleString()})`).join(' · ');
  return `• ${line.label} — ${inline}`;
}

function indexEventsByName(events: Ga4EventTotal[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) m.set(e.eventName, e.eventCount);
  return m;
}

function indexEventBreakdowns(
  breakdowns: Ga4EventBreakdown[],
): Map<string, Ga4EventBreakdown> {
  const m = new Map<string, Ga4EventBreakdown>();
  for (const b of breakdowns) m.set(`${b.lineLabel}::${b.paramApiName}`, b);
  return m;
}

// ---------- global GA4 breakdowns (App topic, inline string) ----------

function renderGlobalBreakdownsInline(ga4: Ga4Metrics): string | null {
  const populated = ga4.breakdowns.filter((b) => b.rows.length > 0);
  if (populated.length === 0) return null;
  return ['*Top traffic breakdowns (Analytics events)*', ...populated.map(renderBreakdown)].join('\n');
}

function renderBreakdown(b: Ga4Breakdown): string {
  const lines = b.rows.map(
    (r) =>
      `• ${truncate(r.value, 40)} — ${r.eventCount.toLocaleString()} (${r.totalUsers.toLocaleString()} users)`,
  );
  return `_${b.displayName}_\n${lines.join('\n')}`;
}

// ---------- utilities ----------

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function formatDateRange(window: ReportWindow): string {
  const from = window.from.toISOString().slice(0, 10);
  const to = window.to.toISOString().slice(0, 10);
  return `${from} → ${to}`;
}

function formatNumber(n: number, decimals = 0): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
}
