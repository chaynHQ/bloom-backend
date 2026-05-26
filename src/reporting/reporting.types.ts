export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Periods that render per-topic breakdowns + event detail.
 *  Daily is scannable: a trimmed headline + anomalies only. */
export const PERIODS_WITH_FULL_DETAIL: ReadonlyArray<ReportPeriod> = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

/** Skip the `+N more` cap on breakdown children. */
export const PERIODS_WITH_UNCAPPED_BREAKDOWNS: ReadonlyArray<ReportPeriod> = [
  'quarterly',
  'yearly',
];

/** Periods that render the Errors thread reply. Daily covers errors via the
 *  outage watchlist + anomaly-scored GA error events (no thread). Weekly is
 *  the recurring "what broke this week" sweep. Monthly+ are long-period
 *  summaries — error detail is stale by then and dilutes the trend view. */
export const PERIODS_WITH_ERRORS_THREAD: ReadonlyArray<ReportPeriod> = ['weekly'];

/** Per-period tuning for the anomaly + delta pipeline. Daily fires 365×/year
 *  on lowish absolute counts, so its noise/signal characteristics differ from
 *  weekly+: a wider baseline window for day-of-week smoothing, a stricter
 *  sigma cut to compensate for high relative variance, and a permissive
 *  delta-suppression floor so small but real movements still render. */
export interface PeriodTuning {
  /** Number of prior `reporting_run` rows used to compute baseline mean/std. */
  baselineWindowSize: number;
  /** |z| threshold above which a metric surfaces in the "Worth looking at"
   *  section. Higher = stricter; daily uses 2.5 vs weekly+'s 2.0. */
  anomalySigmaThreshold: number;
  /** Suppress `↑/↓ X%` deltas when the baseline mean is below this floor.
   *  Daily lowers to 1 — almost any non-zero mean produces a meaningful
   *  movement at 24h cadence; weekly+ keeps the higher floor because their
   *  larger absolute counts make tiny means more likely to be noise. */
  deltaBaselineFloor: number;
}

export const PERIOD_TUNING: Record<ReportPeriod, PeriodTuning> = {
  daily: { baselineWindowSize: 7, anomalySigmaThreshold: 2.5, deltaBaselineFloor: 1 },
  weekly: { baselineWindowSize: 4, anomalySigmaThreshold: 2, deltaBaselineFloor: 5 },
  monthly: { baselineWindowSize: 4, anomalySigmaThreshold: 2, deltaBaselineFloor: 5 },
  quarterly: { baselineWindowSize: 4, anomalySigmaThreshold: 2, deltaBaselineFloor: 5 },
  yearly: { baselineWindowSize: 4, anomalySigmaThreshold: 2, deltaBaselineFloor: 5 },
};

export interface ReportWindow {
  from: Date;
  to: Date;
  label: string;
  timezone: string;
}

/** Period counts from the DB. Each field is `number | null`: `null` means
 *  the underlying query failed for this run; renderer shows `N/A` and skips
 *  delta/anomaly math. Distinct from `0`, which is a real observed value. */
export interface DbMetrics {
  newUsers: number | null;
  /** New users created in the window with ≥1 partner_access row attached
   *  (regardless of activation). Whether they redeemed a code themselves vs
   *  were granted access is secondary — the common case is partner-attached
   *  signup. */
  newPartnerUsers: number | null;
  deletedUsers: number | null;
  activeUsers: number | null;
  coursesStarted: number | null;
  coursesCompleted: number | null;
  sessionsStarted: number | null;
  sessionsCompleted: number | null;
  resourcesStarted: number | null;
  resourcesCompleted: number | null;
  therapyBookingsBooked: number | null;
  therapyBookingsCancelled: number | null;
  /** Best proxy for therapy sessions delivered: bookings whose `startDateTime`
   *  falls in the window AND aren't cancelled. No COMPLETED_BOOKING webhook
   *  is wired, so we infer completion from scheduling + non-cancellation. */
  therapySessionsCompleted: number | null;
  partnerAccessGrants: number | null;
  partnerAccessActivations: number | null;
  whatsappSubscribed: number | null;
  whatsappUnsubscribed: number | null;
  sessionFeedbackSubmitted: number | null;
  resourceFeedbackSubmitted: number | null;
  /** Count of `event_log` rows with event = CHAT_MESSAGE_SENT created in the
   *  window. Authoritative chat-sent count — distinct from the GA4
   *  `CHAT_MESSAGE_SENT` event, which is subject to ad-blocker / consent loss. */
  messagesSent: number | null;
  /** Count of `event_log` rows with event = CHAT_MESSAGE_RECEIVED in the
   *  window. Inbound side of the chat thread. */
  messagesReceived: number | null;
}

/** Persisted on `reporting_run` for baseline reconstruction. Adding a key
 *  here requires a matching migration + column on ReportingRunEntity. */
export const DB_METRIC_KEYS_PERSISTED = [
  'newUsers',
  'newPartnerUsers',
  'deletedUsers',
  'activeUsers',
  'coursesStarted',
  'coursesCompleted',
  'sessionsStarted',
  'sessionsCompleted',
  'resourcesStarted',
  'resourcesCompleted',
  'therapyBookingsBooked',
  'therapyBookingsCancelled',
  'therapySessionsCompleted',
  'partnerAccessGrants',
  'partnerAccessActivations',
  'whatsappSubscribed',
  'whatsappUnsubscribed',
  'sessionFeedbackSubmitted',
  'resourceFeedbackSubmitted',
  'messagesSent',
  'messagesReceived',
] as const satisfies ReadonlyArray<keyof DbMetrics>;

export const DB_METRIC_KEYS = DB_METRIC_KEYS_PERSISTED;

export const DB_METRIC_LABELS: Record<keyof DbMetrics, string> = {
  newUsers: 'New users',
  newPartnerUsers: 'New partner users',
  deletedUsers: 'Deleted users',
  activeUsers: 'Active users',
  coursesStarted: 'Courses started',
  coursesCompleted: 'Courses completed',
  sessionsStarted: 'Sessions started',
  sessionsCompleted: 'Sessions completed',
  resourcesStarted: 'Resources started',
  resourcesCompleted: 'Resources completed',
  therapyBookingsBooked: 'Therapy bookings made',
  therapyBookingsCancelled: 'Therapy cancellations',
  therapySessionsCompleted: 'Therapy sessions completed',
  partnerAccessGrants: 'Partner access grants',
  partnerAccessActivations: 'Partner access activations',
  whatsappSubscribed: 'Notes from Bloom subscribed',
  whatsappUnsubscribed: 'Notes from Bloom unsubscribed',
  sessionFeedbackSubmitted: 'Session feedback',
  resourceFeedbackSubmitted: 'Resource feedback',
  messagesSent: 'Messages sent',
  messagesReceived: 'Messages received',
};

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
  activeUsers: 'Active users (GA)',
  newUsers: 'New users (GA)',
  sessions: 'Sessions (GA)',
  screenPageViews: 'Pageviews',
  averageSessionDuration: 'Avg session (s)',
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

export interface DbSessionBreakdownRow {
  name: string;
  started: number;
  completed: number;
}

export interface DbCourseBreakdownRow {
  name: string;
  coursesStarted: number;
  coursesCompleted: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessions: DbSessionBreakdownRow[];
}

export interface DbResourceBreakdownRow {
  name: string;
  started: number;
  completed: number;
}

export interface DbResourceCategoryBreakdownRow {
  /** Raw enum from ResourceEntity (short_video / single_video / conversation).
   *  Humanised at render time. */
  category: string;
  resourcesStarted: number;
  resourcesCompleted: number;
  resources: DbResourceBreakdownRow[];
}

export interface DbNamedCount {
  name: string;
  count: number;
}

/** Preferred over GA equivalents — GA custom dimensions lose events to
 *  ad-blockers, consent refusals, and frontend-payload drift. */
export interface DbBreakdowns {
  courses: DbCourseBreakdownRow[];
  resources: DbResourceCategoryBreakdownRow[];
  /** Includes 'Public (no partner)' for users with no PartnerAccess row. */
  newUsersByPartner: DbNamedCount[];
  partnerAccessGrantsByPartner: DbNamedCount[];
  partnerAccessActivationsByPartner: DbNamedCount[];
  newUsersByLanguage: DbNamedCount[];
  sessionFeedbackByTag: DbNamedCount[];
  resourceFeedbackByTag: DbNamedCount[];
  /** By `serviceProviderName` — therapist load. Non-cancelled bookings only. */
  therapyByTherapist: DbNamedCount[];
  therapyByPartner: DbNamedCount[];
}

/** stdDev === 0 → z-score undefined; render as context only. */
export interface BaselineStat {
  mean: number;
  stdDev: number;
  sampleSize: number;
}

export interface ReportBaseline {
  db: Partial<Record<keyof DbMetrics, BaselineStat>>;
  ga4Overview: Partial<Record<keyof Ga4OverviewMetrics, BaselineStat>>;
  /** Keyed by GA4 event name. Populated from prior runs' `ga4Events` JSONB. */
  ga4Events: Record<string, BaselineStat>;
  sampleSize: number;
}

/** A metric whose current value deviates >=2σ from its rolling baseline.
 *  `source` identifies the data family (used for the DB/GA label suffix);
 *  `ga4-event` is a single GA4 event, distinct from `ga4` overview metrics. */
export interface Anomaly {
  source: 'db' | 'ga4' | 'ga4-event';
  label: string;
  current: number;
  mean: number;
  sigma: number;
}

export interface ReportPayload {
  period: ReportPeriod;
  window: ReportWindow;
  /** Always present — DbMetricsService.collect() never throws. Individual
   *  metrics can be `null` when their underlying query failed; see DbMetrics. */
  db: DbMetrics;
  /** Omitted silently if the grouping query fails — counts above still render. */
  dbBreakdowns?: DbBreakdowns;
  ga4: Ga4Metrics;
  trigger: 'scheduled' | 'manual';
  runId?: string;
  /** Absent until MIN_BASELINE_SAMPLES prior runs exist for this period. */
  baseline?: ReportBaseline;
  anomalies?: Anomaly[];
}

export interface RunOptions {
  /** When unset, defaults to `true` on non-production (staging/dev/test) so
   *  repeat runs replay rather than silently skip, and `false` on production
   *  so the unique-slot lock still enforces one-row-per-period. */
  bypassIdempotency?: boolean;
  trigger?: 'scheduled' | 'manual';
}
