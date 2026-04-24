export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Periods that load a rolling baseline + render per-cell `↑/↓ X% vs avg M`. */
export const PERIODS_WITH_BASELINE: ReadonlyArray<ReportPeriod> = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

/** Periods that render per-topic breakdowns + funnels + event detail.
 *  Daily is scannable: anomalies + grids + errors only. */
export const PERIODS_WITH_FULL_DETAIL: ReadonlyArray<ReportPeriod> = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const PERIODS_WITH_TOTALS: ReadonlyArray<ReportPeriod> = ['quarterly', 'yearly'];

/** Skip the `+N more` cap on breakdown children. */
export const PERIODS_WITH_UNCAPPED_BREAKDOWNS: ReadonlyArray<ReportPeriod> = [
  'quarterly',
  'yearly',
];

export interface ReportWindow {
  from: Date;
  to: Date;
  label: string;
  timezone: string;
}

/** Period counts from the DB. New fields render without a baseline until
 *  matching columns are added to ReportingRunEntity (see DB_METRIC_KEYS_PERSISTED). */
export interface DbMetrics {
  newUsers: number;
  deletedUsers: number;
  coursesStarted: number;
  coursesCompleted: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  resourcesStarted: number;
  resourcesCompleted: number;
  therapyBookingsBooked: number;
  therapyBookingsCancelled: number;
  therapyBookingsScheduledForPeriod: number;
  partnerAccessGrants: number;
  partnerAccessActivations: number;
  whatsappSubscribed: number;
  whatsappUnsubscribed: number;
  sessionFeedbackSubmitted: number;
  resourceFeedbackSubmitted: number;
  /** Integer percent 0–100. Same-period activation: % of users who signed up
   *  in the window AND completed ≥1 session in the same window. 0 when no
   *  new users — treat as "no sample" (baseline math handles the flat row
   *  via `isFlatlineZero` in the renderer). */
  activationRate: number;
  /** Integer percent 0–100. % of users who signed up in the window AND have
   *  at least one partner_access row activated by report time. Measures
   *  cohort quality, not total partner-access activations (see
   *  `partnerAccessActivations` for the latter). */
  partnerActivationRate: number;
}

/** Persisted on `reporting_run` for baseline reconstruction. Adding a key
 *  here requires a matching migration + column on ReportingRunEntity. */
export const DB_METRIC_KEYS_PERSISTED = [
  'newUsers',
  'deletedUsers',
  'coursesStarted',
  'coursesCompleted',
  'sessionsStarted',
  'sessionsCompleted',
  'resourcesStarted',
  'resourcesCompleted',
  'therapyBookingsBooked',
  'therapyBookingsCancelled',
  'therapyBookingsScheduledForPeriod',
  'partnerAccessGrants',
  'partnerAccessActivations',
  'whatsappSubscribed',
  'whatsappUnsubscribed',
  'sessionFeedbackSubmitted',
  'resourceFeedbackSubmitted',
  'activationRate',
  'partnerActivationRate',
] as const satisfies ReadonlyArray<keyof DbMetrics>;

/** Alias used by persistence + baseline code. */
export const DB_METRIC_KEYS = DB_METRIC_KEYS_PERSISTED;

export const DB_METRIC_LABELS: Record<keyof DbMetrics, string> = {
  newUsers: 'New users',
  deletedUsers: 'Deleted users',
  coursesStarted: 'Courses started',
  coursesCompleted: 'Courses completed',
  sessionsStarted: 'Sessions started',
  sessionsCompleted: 'Sessions completed',
  resourcesStarted: 'Resources started',
  resourcesCompleted: 'Resources completed',
  therapyBookingsBooked: 'Therapy bookings made',
  therapyBookingsCancelled: 'Therapy cancellations',
  therapyBookingsScheduledForPeriod: 'Therapy scheduled',
  partnerAccessGrants: 'Partner access grants',
  partnerAccessActivations: 'Partner access activations',
  whatsappSubscribed: 'WhatsApp subscribed',
  whatsappUnsubscribed: 'WhatsApp unsubscribed',
  sessionFeedbackSubmitted: 'Session feedback',
  resourceFeedbackSubmitted: 'Resource feedback',
  activationRate: 'Activation rate (%)',
  partnerActivationRate: 'Partner activation rate (%)',
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
  activeUsers: 'Active users',
  newUsers: 'New users (GA)',
  sessions: 'Sessions',
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

/**
 * State-of-Bloom snapshot at report time.
 * - Active WhatsApp subscriber → `cancelledAt IS NULL` on subscription_user
 *   joined to subscription.name = 'whatsapp'.
 * - Therapy booking → non-cancelled TherapySession (NOT delivered;
 *   COMPLETED_BOOKING webhook isn't wired).
 */
export interface DbTotals {
  liveUsers: number;
  activeWhatsappSubscribers: number;
  activatedPartnerAccess: number;
  totalSessionsCompleted: number;
  totalCoursesCompleted: number;
  totalResourcesCompleted: number;
  totalTherapyBookings: number;
}

export const DB_TOTALS_KEYS = [
  'liveUsers',
  'activeWhatsappSubscribers',
  'activatedPartnerAccess',
  'totalSessionsCompleted',
  'totalCoursesCompleted',
  'totalResourcesCompleted',
  'totalTherapyBookings',
] as const satisfies ReadonlyArray<keyof DbTotals>;

export const DB_TOTALS_LABELS: Record<keyof DbTotals, string> = {
  liveUsers: 'Live users',
  activeWhatsappSubscribers: 'Active WhatsApp',
  activatedPartnerAccess: 'Active partner access',
  totalSessionsCompleted: 'Sessions completed (total)',
  totalCoursesCompleted: 'Courses completed (total)',
  totalResourcesCompleted: 'Resources completed (total)',
  totalTherapyBookings: 'Therapy bookings (total)',
};

type _MissingTotalsKeys = Exclude<keyof DbTotals, (typeof DB_TOTALS_KEYS)[number]>;
// eslint-disable-next-line
const _ensureAllTotalsKeysCovered: [_MissingTotalsKeys] extends [never]
  ? true
  : `DB_TOTALS_KEYS missing: ${_MissingTotalsKeys & string}` = true;

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
  db: DbMetrics | { unavailable: true; reason: string };
  /** Omitted silently if the grouping query fails — counts above still render. */
  dbBreakdowns?: DbBreakdowns;
  /** Quarterly + yearly only (PERIODS_WITH_TOTALS). */
  dbTotals?: DbTotals;
  ga4: Ga4Metrics;
  trigger: 'scheduled' | 'manual';
  runId?: string;
  /** Absent until MIN_BASELINE_SAMPLES prior runs exist for this period. */
  baseline?: ReportBaseline;
  anomalies?: Anomaly[];
}

export interface RunOptions {
  force?: boolean;
  /** When unset, defaults to `true` on non-production (staging/dev/test) so
   *  repeat runs replay rather than silently skip, and `false` on production
   *  so the unique-slot lock still enforces one-row-per-period. */
  bypassIdempotency?: boolean;
  trigger?: 'scheduled' | 'manual';
}
