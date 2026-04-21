export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Periods that compute a rolling baseline and render anomaly flags.
 *  Weekly skips — it's the full-detail view without comparison framing. */
export const PERIODS_WITH_BASELINE: ReadonlyArray<ReportPeriod> = [
  'daily',
  'monthly',
  'quarterly',
  'yearly',
];

/** Periods that render per-line `↳` sub-lines and global breakdowns.
 *  Daily stays stripped of these to remain scannable. */
export const PERIODS_WITH_FULL_DETAIL: ReadonlyArray<ReportPeriod> = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

/** Periods that render the "Bloom totals" state-of-Bloom snapshot. */
export const PERIODS_WITH_TOTALS: ReadonlyArray<ReportPeriod> = [
  'quarterly',
  'yearly',
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
  resourcesStarted: number;
  resourcesCompleted: number;
  therapyBookingsBooked: number;
  therapyBookingsCancelled: number;
  therapyBookingsScheduledForPeriod: number;
  partnerAccessGrants: number;
  partnerAccessActivations: number;
  whatsappSubscribed: number;
  whatsappUnsubscribed: number;
}

/** Ordered keys driving persistence to `reporting_run` and baseline
 *  reconstruction. The exhaustiveness check below forces new DbMetrics
 *  fields to be added here. */
export const DB_METRIC_KEYS = [
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
] as const satisfies ReadonlyArray<keyof DbMetrics>;

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
  therapyBookingsScheduledForPeriod: 'Therapy scheduled in period',
  partnerAccessGrants: 'Partner access grants',
  partnerAccessActivations: 'Partner access activations',
  whatsappSubscribed: 'WhatsApp subscribed',
  whatsappUnsubscribed: 'WhatsApp unsubscribed',
};

// Compile-time exhaustiveness check.
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
  newUsers: 'New users (Google Analytics Events)',
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

export interface DbSessionBreakdownRow {
  name: string;
  count: number;
}

export interface DbCourseBreakdownRow {
  name: string;
  /** SessionUser rows whose parent Session sits under this course. */
  sessionCompletions: number;
  /** CourseUser rows completed in the window for this course. */
  courseCompletions: number;
  /** Top completed sessions within this course, desc by count. */
  sessions: DbSessionBreakdownRow[];
}

export interface DbResourceBreakdownRow {
  name: string;
  count: number;
}

export interface DbResourceCategoryBreakdownRow {
  /** Raw category enum value from ResourceEntity (short_video / single_video
   *  / conversation). Humanised at render time. */
  category: string;
  resourceCompletions: number;
  resources: DbResourceBreakdownRow[];
}

/** DB-authoritative "what was completed", joined to
 *  SessionEntity/CourseEntity/ResourceEntity names. Preferred over the GA
 *  equivalents because GA custom dimensions lose events to ad-blockers,
 *  consent refusals, and frontend-payload drift. */
export interface DbBreakdowns {
  completedCourses: DbCourseBreakdownRow[];
  completedResources: DbResourceCategoryBreakdownRow[];
}

/**
 * State-of-Bloom snapshot at report time. Definitions follow Bloom's
 * existing conventions:
 * - Active WhatsApp subscriber → `cancelledAt IS NULL` on subscription_user
 *   joined to subscription.name = 'whatsapp' (see
 *   SubscriptionUserService.createWhatsappSubscription).
 * - Therapy booking → non-cancelled TherapySession. `COMPLETED_BOOKING`
 *   isn't wired (no SimplyBook webhook) so "delivered" is not a claim we
 *   can make.
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
  activeWhatsappSubscribers: 'Active WhatsApp subscribers',
  activatedPartnerAccess: 'Activated partner access',
  totalSessionsCompleted: 'Total sessions completed',
  totalCoursesCompleted: 'Total courses completed',
  totalResourcesCompleted: 'Total resources completed',
  totalTherapyBookings: 'Total therapy bookings',
};

type _MissingTotalsKeys = Exclude<keyof DbTotals, (typeof DB_TOTALS_KEYS)[number]>;
// eslint-disable-next-line
const _ensureAllTotalsKeysCovered: [_MissingTotalsKeys] extends [never]
  ? true
  : `DB_TOTALS_KEYS missing: ${_MissingTotalsKeys & string}` = true;

/** Rolling baseline for one metric. `stdDev === 0` means z-score is
 *  undefined — render as context only, no anomaly detection. */
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

/** A metric whose current value deviates >=2σ from its rolling baseline. */
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
  /** Top completed sessions/courses by name — DB-authoritative. Omitted
   *  silently if the grouping query fails (the numeric counts above are
   *  still useful on their own). */
  dbBreakdowns?: DbBreakdowns;
  /** State-of-Bloom snapshot. Rendered on quarterly + yearly digests only
   *  (PERIODS_WITH_TOTALS). Omitted silently if the query fails. */
  dbTotals?: DbTotals;
  ga4: Ga4Metrics;
  trigger: 'scheduled' | 'manual';
  runId?: string;
  /** Rolling baseline over prior runs. Absent on weekly and before
   *  MIN_BASELINE_SAMPLES prior runs exist. */
  baseline?: ReportBaseline;
  /** Top-3 metrics with |z|>=2 vs baseline. Empty array if none. */
  anomalies?: Anomaly[];
}

export interface RunOptions {
  force?: boolean;
  bypassIdempotency?: boolean;
  trigger?: 'scheduled' | 'manual';
}
