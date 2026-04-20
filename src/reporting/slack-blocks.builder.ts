import { SLACK_BLOCK_SAFETY_MARGIN } from './reporting.constants';
import { EVENT_GROUPS, EventGroup, EventLine } from './reporting.events';
import { FUNNELS } from './reporting.funnels';
import {
  Anomaly,
  BaselineStat,
  DB_METRIC_LABELS,
  DbMetrics,
  GA4_OVERVIEW_LABELS,
  Ga4Breakdown,
  Ga4EventBreakdown,
  Ga4EventTotal,
  Ga4Metrics,
  Ga4OverviewMetrics,
  PERIODS_WITH_FULL_DETAIL,
  ReportBaseline,
  ReportPayload,
  ReportWindow,
} from './reporting.types';

type Block = Record<string, unknown>;

export function buildReportBlocks(payload: ReportPayload): Block[] {
  const blocks: Block[] = [];
  const withDetail = PERIODS_WITH_FULL_DETAIL.includes(payload.period);
  const baseline = payload.baseline;
  const anomalies = payload.anomalies ?? [];

  blocks.push(headerBlock(payload));
  blocks.push(contextBlock(payload));

  if (anomalies.length > 0) {
    blocks.push(dividerBlock());
    blocks.push(...anomaliesSection(anomalies, baseline));
  }

  blocks.push(dividerBlock());
  blocks.push(...dbSection(payload.db, baseline));

  blocks.push(dividerBlock());
  blocks.push(...ga4OverviewSection(payload.ga4, baseline));

  const funnelBlocks = funnelsSection(payload.ga4);
  if (funnelBlocks.length > 0) {
    blocks.push(dividerBlock());
    blocks.push(...funnelBlocks);
  }

  blocks.push(dividerBlock());
  blocks.push(...groupedEventsSection(payload.ga4, withDetail));

  if (withDetail) {
    const breakdownBlocks = breakdownsSection(payload.ga4);
    if (breakdownBlocks.length > 0) {
      blocks.push(dividerBlock());
      blocks.push(...breakdownBlocks);
    }
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

// ---------- blocks ----------

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
    elements: [{ type: 'mrkdwn', text: pieces.join(' · ') }],
  };
}

function dividerBlock(): Block {
  return { type: 'divider' };
}

function mrkdwnSection(text: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function fieldsSection(fields: Array<{ label: string; value: string }>): Block {
  return {
    type: 'section',
    fields: fields.map((f) => ({ type: 'mrkdwn', text: `*${f.label}*\n${f.value}` })),
  };
}

// ---------- Anomalies ----------

function anomaliesSection(
  anomalies: Anomaly[],
  baseline: ReportBaseline | undefined,
): Block[] {
  const lines = anomalies.map((a) => {
    const arrow = a.sigma > 0 ? '↑' : '↓';
    const qualitative = a.sigma > 0 ? 'unusually high' : 'unusually low';
    const pct = Math.abs(Math.round(((a.current - a.mean) / a.mean) * 100));
    const avg = formatNumber(a.mean);
    const sourceLabel = a.source === 'db' ? 'DB' : 'GA4';
    return `• *${a.label}* (${sourceLabel}) — ${a.current.toLocaleString()} (${arrow} ${pct}% vs avg ${avg}, ${qualitative})`;
  });
  const header = baseline
    ? `*:rotating_light: Worth looking at* _(vs last ${baseline.sampleSize}-period baseline)_`
    : '*:rotating_light: Worth looking at*';
  return [mrkdwnSection(`${header}\n${lines.join('\n')}`)];
}

// ---------- DB section ----------

function dbSection(
  db: ReportPayload['db'],
  baseline: ReportBaseline | undefined,
): Block[] {
  if ('unavailable' in db) {
    return [mrkdwnSection(`:warning: *Database metrics unavailable* — ${db.reason}`)];
  }

  const out: Block[] = [mrkdwnSection('*:bar_chart: Bloom database activity*')];
  const fields = dbFields(db, baseline?.db);
  for (let i = 0; i < fields.length; i += 10) {
    out.push(fieldsSection(fields.slice(i, i + 10)));
  }
  return out;
}

function dbFields(
  db: DbMetrics,
  baseline: ReportBaseline['db'] | undefined,
): Array<{ label: string; value: string }> {
  return (Object.keys(DB_METRIC_LABELS) as Array<keyof DbMetrics>).map((key) => ({
    label: DB_METRIC_LABELS[key],
    value: formatWithBaseline(db[key], baseline?.[key]),
  }));
}

// ---------- GA4 overview ----------

function ga4OverviewSection(
  ga4: Ga4Metrics,
  baseline: ReportBaseline | undefined,
): Block[] {
  if ('unavailable' in ga4.overview) {
    return [mrkdwnSection(`:warning: *GA4 overview unavailable* — ${ga4.overview.reason}`)];
  }
  const o: Ga4OverviewMetrics = ga4.overview;
  const base = baseline?.ga4Overview;
  return [
    mrkdwnSection('*:bar_chart: GA4 overview*'),
    fieldsSection(
      (Object.keys(GA4_OVERVIEW_LABELS) as Array<keyof Ga4OverviewMetrics>).map((key) => ({
        label: GA4_OVERVIEW_LABELS[key],
        value: formatWithBaseline(o[key], base?.[key], key === 'averageSessionDuration' ? 1 : 0),
      })),
    ),
  ];
}

// ---------- Grouped events ----------

function groupedEventsSection(ga4: Ga4Metrics, withDetail: boolean): Block[] {
  if ('unavailable' in ga4.events) {
    return [mrkdwnSection(`:warning: *App activity unavailable* — ${ga4.events.reason}`)];
  }

  const countByEvent = indexEventsByName(ga4.events);
  const lineBreakdowns = withDetail ? indexEventBreakdowns(ga4.eventBreakdowns) : new Map();
  const blocks: Block[] = [];

  blocks.push(mrkdwnSection('*:sparkles: App activity by area*'));
  for (const group of EVENT_GROUPS) {
    const rendered = renderGroup(group, countByEvent, lineBreakdowns);
    if (rendered) blocks.push(mrkdwnSection(rendered));
  }

  const groupedEventNames = collectGroupedEventNames();
  const uncategorised = ga4.events
    .filter((e) => !groupedEventNames.has(e.eventName) && e.eventCount > 0)
    .slice(0, 10);
  if (uncategorised.length > 0) {
    const lines = uncategorised.map(
      (e) => `• \`${e.eventName}\` — ${e.eventCount.toLocaleString()}`,
    );
    blocks.push(
      mrkdwnSection(
        `*:grey_question: Uncategorised events*\n_Events firing in GA4 that aren't in the report config — consider categorising them._\n${lines.join('\n')}`,
      ),
    );
  }

  if (blocks.length === 0) {
    blocks.push(mrkdwnSection('*:chart_with_downwards_trend: App activity* — _no events in this window_'));
  }

  return blocks;
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

function collectGroupedEventNames(): Set<string> {
  const set = new Set<string>();
  for (const g of EVENT_GROUPS) {
    for (const line of g.lines) {
      for (const item of line.items) set.add(item.event);
    }
  }
  return set;
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

  return `*${group.emoji} ${group.title}*\n${renderedLines.join('\n')}`;
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

// ---------- Conversion funnels ----------

function funnelsSection(ga4: Ga4Metrics): Block[] {
  if ('unavailable' in ga4.events) return [];
  const counts = indexEventsByName(ga4.events);

  const lines: string[] = [];
  for (const funnel of FUNNELS) {
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

  if (lines.length === 0) return [];
  return [mrkdwnSection(`*:chart_with_upwards_trend: Conversion funnels*\n${lines.join('\n')}`)];
}

// ---------- GA4 breakdowns ----------

function breakdownsSection(ga4: Ga4Metrics): Block[] {
  const populated = ga4.breakdowns.filter((b) => b.rows.length > 0);
  if (populated.length === 0) return [];

  const blocks: Block[] = [mrkdwnSection('*:mag: GA4 breakdowns*')];
  for (const b of populated) {
    blocks.push(mrkdwnSection(renderBreakdown(b)));
  }
  return blocks;
}

function renderBreakdown(b: Ga4Breakdown): string {
  const lines = b.rows.map(
    (r) =>
      `• ${truncate(r.value, 40)} — ${r.eventCount.toLocaleString()} (${r.totalUsers.toLocaleString()} users)`,
  );
  return `*${b.displayName}*\n${lines.join('\n')}`;
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

/**
 * Render a metric with optional baseline context. Three states:
 * - no baseline → raw number
 * - baseline but metric is within 1σ of mean → `N (avg M)` as context only
 * - metric is >=1σ from mean → `N (↑/↓ X% vs avg M)` as percent deviation
 *
 * Sigma is used only as the "is this worth annotating?" threshold. The
 * deviation shown to the reader is a plain percentage vs the mean — more
 * intuitive than "1.8σ" for a non-statistician reader. A zero baseline
 * mean implies zero stdDev (counts can't be negative), so the stdDev
 * check transitively guards against percent-of-zero.
 */
function formatWithBaseline(
  current: number,
  baseline: BaselineStat | undefined,
  decimals = 0,
): string {
  const formatted = formatNumber(current, decimals);
  if (!baseline) return formatted;

  const avg = formatNumber(baseline.mean, decimals);

  if (baseline.stdDev === 0) {
    return `${formatted} (avg ${avg})`;
  }

  const sigma = (current - baseline.mean) / baseline.stdDev;
  if (Math.abs(sigma) < 1) {
    return `${formatted} (avg ${avg})`;
  }

  const pct = Math.abs(Math.round(((current - baseline.mean) / baseline.mean) * 100));
  const arrow = sigma > 0 ? '↑' : '↓';
  return `${formatted} (${arrow} ${pct}% vs avg ${avg})`;
}
