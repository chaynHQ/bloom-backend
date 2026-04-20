export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Periods that fetch a rolling baseline from `reporting_run` and render
 * baseline-relative annotations (+ anomaly flagging). Weekly deliberately
 * skips — it's the full-detail "what happened this week" view without
 * comparison framing, per team preference.
 */
export const PERIODS_WITH_BASELINE: ReadonlyArray<ReportPeriod> = [
  'daily',
  'monthly',
  'quarterly',
];

/**
 * Periods that render the full event/breakdown detail. Daily is stripped
 * of the per-line `↳` sub-lines and global breakdowns to stay scannable
 * for anomaly detection. Weekly/monthly/quarterly show full depth.
 */
export const PERIODS_WITH_FULL_DETAIL: ReadonlyArray<ReportPeriod> = [
  'weekly',
  'monthly',
  'quarterly',
];

export interface ReportWindow {
  from: Date;
  to: Date;
  label: string;
  timezone: string;
}

export interface DbMetrics {
  newUsers: number;
  deletedUsers: number;
  coursesStarted: number;
  coursesCompleted: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  therapyBookingsBooked: number;
  therapyBookingsCancelled: number;
  therapyBookingsScheduledForPeriod: number;
  partnerAccessGrants: number;
  partnerAccessActivations: number;
}

/**
 * Single source of truth for the DB metric columns persisted on
 * `reporting_run` and read back for baseline computation. Adding a new DB
 * metric means: add to DbMetrics, add to ReportingRunEntity + migration,
 * then add the key here — and the persist/reconstruct paths update
 * mechanically. The `_ensureAllKeys` check below makes the "forgot to add
 * it here" case a compile-time error rather than a silent data bug.
 */
export const DB_METRIC_KEYS = [
  'newUsers',
  'deletedUsers',
  'coursesStarted',
  'coursesCompleted',
  'sessionsStarted',
  'sessionsCompleted',
  'therapyBookingsBooked',
  'therapyBookingsCancelled',
  'therapyBookingsScheduledForPeriod',
  'partnerAccessGrants',
  'partnerAccessActivations',
] as const satisfies ReadonlyArray<keyof DbMetrics>;

export const DB_METRIC_LABELS: Record<keyof DbMetrics, string> = {
  newUsers: 'New users',
  deletedUsers: 'Deleted users',
  coursesStarted: 'Courses started',
  coursesCompleted: 'Courses completed',
  sessionsStarted: 'Sessions started',
  sessionsCompleted: 'Sessions completed',
  therapyBookingsBooked: 'Therapy bookings made',
  therapyBookingsCancelled: 'Therapy cancellations',
  therapyBookingsScheduledForPeriod: 'Therapy scheduled in period',
  partnerAccessGrants: 'Partner access grants',
  partnerAccessActivations: 'Partner access activations',
};

// Compile-time exhaustiveness: if you add a field to DbMetrics and forget
// to list it here, TypeScript will error with a message like
// `Type 'true' is not assignable to type 'DB_METRIC_KEYS missing: myNewField'`.
type _MissingDbKeys = Exclude<keyof DbMetrics, (typeof DB_METRIC_KEYS)[number]>;
// eslint-disable-next-line
const _ensureAllDbKeysCovered: [_MissingDbKeys] extends [never]
  ? true
  : `DB_METRIC_KEYS missing: ${_MissingDbKeys & string}` = true;

export interface Ga4OverviewMetrics {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  averageSessionDuration: number;
}

export const GA4_OVERVIEW_KEYS = [
  'activeUsers',
  'newUsers',
  'sessions',
  'screenPageViews',
  'averageSessionDuration',
] as const satisfies ReadonlyArray<keyof Ga4OverviewMetrics>;

export const GA4_OVERVIEW_LABELS: Record<keyof Ga4OverviewMetrics, string> = {
  activeUsers: 'Active users',
  newUsers: 'New users (GA4)',
  sessions: 'Sessions',
  screenPageViews: 'Screen/page views',
  averageSessionDuration: 'Avg session duration (s)',
};

type _MissingGa4Keys = Exclude<keyof Ga4OverviewMetrics, (typeof GA4_OVERVIEW_KEYS)[number]>;
// eslint-disable-next-line
const _ensureAllGa4KeysCovered: [_MissingGa4Keys] extends [never]
  ? true
  : `GA4_OVERVIEW_KEYS missing: ${_MissingGa4Keys & string}` = true;

export interface Ga4EventTotal {
  eventName: string;
  eventCount: number;
  totalUsers: number;
}

interface Ga4BreakdownRow {
  value: string;
  eventCount: number;
  totalUsers: number;
}

export interface Ga4Breakdown {
  apiName: string;
  displayName: string;
  rows: Ga4BreakdownRow[];
}

export interface Ga4EventBreakdown {
  lineLabel: string;
  paramApiName: string;
  paramLabel: string;
  rows: Ga4BreakdownRow[];
}

export interface Ga4Metrics {
  overview: Ga4OverviewMetrics | { unavailable: true; reason: string };
  events: Ga4EventTotal[] | { unavailable: true; reason: string };
  breakdowns: Ga4Breakdown[];
  eventBreakdowns: Ga4EventBreakdown[];
}

/**
 * Rolling baseline statistic for a single metric over the last N periods.
 * `stdDev` of 0 means every historical value was identical — render as
 * context only, no anomaly detection (z-score is undefined).
 */
export interface BaselineStat {
  mean: number;
  stdDev: number;
  sampleSize: number;
}

export interface ReportBaseline {
  db: Partial<Record<keyof DbMetrics, BaselineStat>>;
  ga4Overview: Partial<Record<keyof Ga4OverviewMetrics, BaselineStat>>;
  /** Number of prior runs that contributed to the baseline. */
  sampleSize: number;
}

/**
 * A metric whose current value deviates >=2σ from its rolling baseline.
 * Surfaced in a prominent section at the top of baseline-eligible digests
 * so anomaly detection isn't "read 30 numbers and spot the odd one".
 */
export interface Anomaly {
  source: 'db' | 'ga4';
  label: string;
  current: number;
  mean: number;
  sigma: number; // signed z-score, rounded to 1dp
}

export interface ReportPayload {
  period: ReportPeriod;
  window: ReportWindow;
  db: DbMetrics | { unavailable: true; reason: string };
  ga4: Ga4Metrics;
  trigger: 'scheduled' | 'manual';
  runId?: string;
  /**
   * Rolling baseline over the last ~4 prior runs of this cadence. Absent
   * on weekly (baseline intentionally skipped) and on the first few runs
   * before enough history exists (minimum 3 prior sent runs required).
   */
  baseline?: ReportBaseline;
  /** Top-3 metrics with |z|>=2 vs baseline. Empty array if none. */
  anomalies?: Anomaly[];
}

export interface RunOptions {
  force?: boolean;
  bypassIdempotency?: boolean;
  trigger?: 'scheduled' | 'manual';
}
