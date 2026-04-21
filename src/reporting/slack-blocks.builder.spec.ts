import { DbBreakdowns, DbMetrics, ReportPayload } from './reporting.types';
import { buildReportBlocks } from './slack-blocks.builder';

const baseWindow = {
  from: new Date('2026-04-19T23:00:00.000Z'),
  to: new Date('2026-04-20T22:59:59.999Z'),
  label: '2026-04-20',
  timezone: 'Europe/London',
};

const fullDb: DbMetrics = {
  newUsers: 12,
  deletedUsers: 1,
  coursesStarted: 8,
  coursesCompleted: 3,
  sessionsStarted: 24,
  sessionsCompleted: 9,
  resourcesStarted: 14,
  resourcesCompleted: 7,
  therapyBookingsBooked: 5,
  therapyBookingsCancelled: 1,
  therapyBookingsScheduledForPeriod: 7,
  partnerAccessGrants: 4,
  partnerAccessActivations: 2,
  whatsappSubscribed: 6,
  whatsappUnsubscribed: 1,
  sessionFeedbackSubmitted: 5,
  resourceFeedbackSubmitted: 3,
  activationRate: 23,
  partnerActivationRate: 41,
};

const emptyBreakdowns: DbBreakdowns = {
  courses: [],
  resources: [],
  newUsersByPartner: [],
  partnerAccessGrantsByPartner: [],
  partnerAccessActivationsByPartner: [],
  newUsersByLanguage: [],
  sessionFeedbackByTag: [],
  resourceFeedbackByTag: [],
  therapyByTherapist: [],
  therapyByPartner: [],
};

const unavailable = (reason: string) => ({ unavailable: true as const, reason });

describe('buildReportBlocks', () => {
  it('renders a full weekly digest topic-sectioned (snapshot)', () => {
    const payload: ReportPayload = {
      period: 'weekly',
      window: {
        from: new Date('2026-04-12T23:00:00.000Z'),
        to: new Date('2026-04-19T22:59:59.999Z'),
        label: '2026-W16',
        timezone: 'Europe/London',
      },
      db: fullDb,
      dbBreakdowns: {
        ...emptyBreakdowns,
        courses: [
          {
            name: 'Foundations',
            coursesStarted: 6,
            coursesCompleted: 2,
            sessionsStarted: 14,
            sessionsCompleted: 8,
            sessions: [
              { name: 'Intro', started: 9, completed: 5 },
              { name: 'Reflection', started: 5, completed: 3 },
            ],
          },
        ],
        resources: [
          {
            category: 'short_video',
            resourcesStarted: 9,
            resourcesCompleted: 5,
            resources: [
              { name: 'Breathing', started: 6, completed: 3 },
              { name: 'Grounding', started: 3, completed: 2 },
            ],
          },
        ],
        newUsersByPartner: [
          { name: 'Bumble', count: 8 },
          { name: 'Public (no partner)', count: 4 },
        ],
        partnerAccessGrantsByPartner: [{ name: 'Bumble', count: 4 }],
        partnerAccessActivationsByPartner: [{ name: 'Bumble', count: 2 }],
        newUsersByLanguage: [{ name: 'en', count: 10 }],
        sessionFeedbackByTag: [{ name: 'useful', count: 3 }],
        resourceFeedbackByTag: [{ name: 'relatable', count: 3 }],
        therapyByTherapist: [{ name: 'Dr Jane Smith', count: 4 }],
        therapyByPartner: [{ name: 'Bumble', count: 5 }],
      },
      ga4: {
        overview: {
          activeUsers: 1234,
          newUsers: 210,
          sessions: 1890,
          screenPageViews: 4212,
          averageSessionDuration: 123.4,
        },
        events: [
          { eventName: 'LOGIN_SUCCESS', eventCount: 142, totalUsers: 120 },
          { eventName: 'REGISTER_SUCCESS', eventCount: 28, totalUsers: 28 },
          { eventName: 'SESSION_VIEWED', eventCount: 56, totalUsers: 40 },
          { eventName: 'SESSION_VIDEO_STARTED', eventCount: 32, totalUsers: 28 },
          { eventName: 'LOGIN_ERROR', eventCount: 3, totalUsers: 3 },
        ],
        breakdowns: [
          {
            apiName: 'pagePath',
            displayName: 'Top pages',
            rows: [{ value: '/courses', eventCount: 500, totalUsers: 200 }],
          },
        ],
        eventBreakdowns: [],
      },
      trigger: 'manual',
      runId: 'run-123',
    };
    const blocks = buildReportBlocks(payload);
    // Guard against regression to old "GA4" labels and the dropped
    // Uncategorised events block.
    const serialized = JSON.stringify(blocks);
    expect(serialized).not.toContain('GA4');
    expect(serialized).not.toContain('Uncategorised');
    expect(blocks).toMatchSnapshot();
  });

  it('baselined cells render `↑/↓ X% vs avg M`; cells without a baseline render as 2 lines only', () => {
    const baseline = {
      sampleSize: 4,
      db: { newUsers: { mean: 10, stdDev: 2, sampleSize: 4 } },
      ga4Overview: {},
      ga4Events: {},
    };
    const serialized = JSON.stringify(
      buildReportBlocks({
        period: 'weekly',
        window: baseWindow,
        db: { ...fullDb, newUsers: 12 },
        ga4: {
          overview: unavailable('x'),
          events: [],
          breakdowns: [],
          eventBreakdowns: [],
        },
        baseline,
        trigger: 'scheduled',
      }),
    );
    expect(serialized).toContain('↑ 20% vs avg 10');
    // No more `_no baseline_` noise — cells without a baseline drop the delta
    // line entirely rather than emitting a placeholder.
    expect(serialized).not.toContain('_no baseline_');
  });

  it('daily strips topic detail (no breakdowns / flows / event detail) but keeps grids + errors', () => {
    const ga4 = {
      overview: {
        activeUsers: 10,
        newUsers: 3,
        sessions: 12,
        screenPageViews: 40,
        averageSessionDuration: 45,
      },
      events: [{ eventName: 'LOGIN_ERROR', eventCount: 2, totalUsers: 2 }],
      breakdowns: [],
      eventBreakdowns: [],
    };
    const daily = JSON.stringify(
      buildReportBlocks({
        period: 'daily',
        window: baseWindow,
        db: fullDb,
        dbBreakdowns: emptyBreakdowns,
        ga4,
        trigger: 'scheduled',
      }),
    );
    expect(daily).not.toContain('*Detail (Analytics events)*');
    expect(daily).not.toContain('*Flows (Analytics events)*');
    expect(daily).not.toContain('*Breakdowns*');
    // Errors always render across cadences.
    expect(daily).toContain('Login errors');
    // Topic grids render.
    expect(daily).toContain('Users & accounts');
    expect(daily).toContain('Resources');
  });

  it('renders Bloom totals on quarterly + yearly only', () => {
    const payload: ReportPayload = {
      period: 'quarterly',
      window: baseWindow,
      db: fullDb,
      dbTotals: {
        liveUsers: 5234,
        activeWhatsappSubscribers: 312,
        activatedPartnerAccess: 124,
        totalSessionsCompleted: 48102,
        totalCoursesCompleted: 12889,
        totalTherapyBookings: 3402,
        totalResourcesCompleted: 2411,
      },
      ga4: {
        overview: unavailable('x'),
        events: unavailable('x'),
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled',
    };
    expect(JSON.stringify(buildReportBlocks(payload))).toContain('Bloom totals');
    expect(
      JSON.stringify(buildReportBlocks({ ...payload, period: 'monthly' })),
    ).not.toContain('Bloom totals');
  });

  it('Resources topic mirrors Courses topic (DB grid + nested breakdowns + tag breakdown)', () => {
    const payload: ReportPayload = {
      period: 'weekly',
      window: baseWindow,
      db: fullDb,
      dbBreakdowns: {
        ...emptyBreakdowns,
        courses: [
          {
            name: 'Foundations',
            coursesStarted: 3,
            coursesCompleted: 1,
            sessionsStarted: 9,
            sessionsCompleted: 5,
            sessions: [{ name: 'Intro', started: 9, completed: 5 }],
          },
        ],
        sessionFeedbackByTag: [{ name: 'useful', count: 3 }],
        resources: [
          {
            category: 'short_video',
            resourcesStarted: 12,
            resourcesCompleted: 8,
            resources: [{ name: 'Breathing', started: 12, completed: 5 }],
          },
        ],
        resourceFeedbackByTag: [{ name: 'relatable', count: 4 }],
      },
      ga4: {
        overview: unavailable('x'),
        events: [],
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled',
    };
    const serialized = JSON.stringify(buildReportBlocks(payload));
    expect(serialized).toContain('*Courses & sessions (DB)*');
    expect(serialized).toContain('*Resources (DB)*');
    // Course header shows both started + completed for the course + its sessions
    // with explicit labels (self-describing, no legend needed).
    expect(serialized).toContain(
      'courses: 3 started · 1 completed · sessions: 9 started · 5 completed',
    );
    // Nested sessions / resources show both counts too.
    expect(serialized).toContain('Intro (9 started · 5 completed)');
    expect(serialized).toContain('Breathing (12 started · 5 completed)');
    expect(serialized).toContain('Session feedback by tag (DB): useful (3)');
    expect(serialized).toContain('Resource feedback by tag (DB): relatable (4)');
  });

  it('caps breakdown children at 8 for weekly, uncapped for quarterly + yearly', () => {
    const manySessions = Array.from({ length: 12 }, (_, i) => ({
      name: `S${i + 1}`,
      started: (12 - i) * 2,
      completed: 12 - i,
    }));
    const breakdowns: DbBreakdowns = {
      ...emptyBreakdowns,
      courses: [
        {
          name: 'Foundations',
          coursesStarted: 0,
          coursesCompleted: 0,
          sessionsStarted: manySessions.reduce((s, r) => s + r.started, 0),
          sessionsCompleted: manySessions.reduce((s, r) => s + r.completed, 0),
          sessions: manySessions,
        },
      ],
    };
    const base = {
      window: baseWindow,
      db: fullDb,
      dbBreakdowns: breakdowns,
      ga4: {
        overview: unavailable('x'),
        events: unavailable('x'),
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled' as const,
    };
    expect(JSON.stringify(buildReportBlocks({ ...base, period: 'weekly' }))).toContain('+4 more');
    expect(JSON.stringify(buildReportBlocks({ ...base, period: 'quarterly' }))).toContain(
      'S12 (2 started · 1 completed)',
    );
  });

  it('renders anomalies at the top with a percent + qualitative flag', () => {
    const payload: ReportPayload = {
      period: 'monthly',
      window: baseWindow,
      db: { ...fullDb, newUsers: 30 },
      ga4: {
        overview: unavailable('pending'),
        events: unavailable('pending'),
        breakdowns: [],
        eventBreakdowns: [],
      },
      baseline: {
        sampleSize: 4,
        db: { newUsers: { mean: 10, stdDev: 10, sampleSize: 4 } },
        ga4Overview: {},
        ga4Events: {},
      },
      anomalies: [
        { source: 'db', label: 'New users', current: 30, mean: 10, sigma: 2.0 },
      ],
      trigger: 'scheduled',
    };
    const serialized = JSON.stringify(buildReportBlocks(payload));
    expect(serialized).toContain('Worth looking at');
    expect(serialized).toContain('200% vs avg 10');
    expect(serialized).toContain('unusually high');
    // Same percent format reused on the matching grid cell.
    expect(serialized).toContain('↑ 200% vs avg 10');
  });
});
