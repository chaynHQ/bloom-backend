import { ReportPayload } from './reporting.types';
import { buildReportBlocks } from './slack-blocks.builder';

const baseWindow = {
  from: new Date('2026-04-19T23:00:00.000Z'),
  to: new Date('2026-04-20T22:59:59.999Z'),
  label: '2026-04-20',
  timezone: 'Europe/London',
};

const fullDb = {
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
};

const unavailable = (reason: string) => ({ unavailable: true as const, reason });

describe('buildReportBlocks', () => {
  it('renders a full weekly digest (snapshot) — DB + nested completed courses, Google Analytics Events overview, grouped events, global breakdowns', () => {
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
        completedResources: [],
        completedCourses: [
          {
            name: 'Foundations',
            sessionCompletions: 8,
            courseCompletions: 2,
            sessions: [
              { name: 'Intro', count: 5 },
              { name: 'Reflection', count: 3 },
            ],
          },
          {
            name: 'Healing from sexual trauma',
            sessionCompletions: 3,
            courseCompletions: 1,
            sessions: [{ name: 'Safety', count: 3 }],
          },
        ],
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
          { eventName: 'SESSION_VIDEO_FINISHED', eventCount: 20, totalUsers: 18 },
          { eventName: 'WHATSAPP_SUBSCRIBE_SUCCESS', eventCount: 20, totalUsers: 20 },
          { eventName: 'LOGIN_ERROR', eventCount: 3, totalUsers: 3 },
          { eventName: 'CUSTOM_FRONTEND_EVENT_NOT_IN_CONFIG', eventCount: 17, totalUsers: 15 },
        ],
        breakdowns: [
          {
            apiName: 'pagePath',
            displayName: 'Top pages',
            rows: [
              { value: '/courses', eventCount: 500, totalUsers: 200 },
              { value: '/therapy', eventCount: 300, totalUsers: 180 },
            ],
          },
        ],
        // No per-event session_name/course_name breakdowns — those titles
        // are now DB-authoritative (see dbBreakdowns above).
        eventBreakdowns: [],
      },
      trigger: 'manual',
      runId: 'run-123',
    };
    const blocks = buildReportBlocks(payload);
    // Guard against regression to the old "GA4" labels — the rename is
    // locked into the snapshot, but this makes the intent explicit.
    expect(JSON.stringify(blocks)).not.toContain('GA4');
    expect(blocks).toMatchSnapshot();
  });

  it('honors cadence-gated sections: daily strips breakdowns, monthly omits totals', () => {
    const breakdowns = {
      completedCourses: [
        {
          name: 'Foundations',
          sessionCompletions: 5,
          courseCompletions: 1,
          sessions: [{ name: 'Intro', count: 5 }],
        },
      ],
      completedResources: [],
    };
    const ga4Full = {
      overview: {
        activeUsers: 10,
        newUsers: 3,
        sessions: 12,
        screenPageViews: 40,
        averageSessionDuration: 45,
      },
      events: [{ eventName: 'SESSION_VIDEO_STARTED', eventCount: 32, totalUsers: 28 }],
      breakdowns: [
        { apiName: 'pagePath', displayName: 'Top pages', rows: [{ value: '/c', eventCount: 5, totalUsers: 5 }] },
      ],
      eventBreakdowns: [
        {
          lineLabel: 'Session video',
          paramApiName: 'customEvent:session_name',
          paramLabel: 'session',
          rows: [{ value: 'Grounding', eventCount: 18, totalUsers: 16 }],
        },
      ],
    };

    // Daily stays scannable: no per-line ↳ sub-lines, no DB title breakdowns,
    // no global GA breakdowns.
    const daily = JSON.stringify(
      buildReportBlocks({
        period: 'daily',
        window: baseWindow,
        db: fullDb,
        dbBreakdowns: breakdowns,
        ga4: ga4Full,
        trigger: 'scheduled',
      }),
    );
    expect(daily).not.toContain('↳');
    expect(daily).not.toContain('Google Analytics Events breakdowns');
    expect(daily).not.toContain('Courses & sessions completed');

    // Monthly: Bloom totals section is gated to quarterly/yearly.
    const monthly = JSON.stringify(
      buildReportBlocks({
        period: 'monthly',
        window: baseWindow,
        db: fullDb,
        ga4: ga4Full,
        trigger: 'scheduled',
      }),
    );
    expect(monthly).not.toContain('Bloom totals');
  });

  it('renders the Bloom totals section when dbTotals is present (quarterly / yearly)', () => {
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
    const serialized = JSON.stringify(buildReportBlocks(payload));
    expect(serialized).toContain('Bloom totals');
    expect(serialized).toContain('Live users');
    expect(serialized).toContain('5,234');
    expect(serialized).toContain('Active WhatsApp subscribers');
    expect(serialized).toContain('Total therapy bookings');
    expect(serialized).toContain('3,402');
  });

  it('renders completed resources nested under their category label', () => {
    const payload: ReportPayload = {
      period: 'weekly',
      window: baseWindow,
      db: fullDb,
      dbBreakdowns: {
        completedCourses: [],
        completedResources: [
          {
            category: 'short_video',
            resourceCompletions: 8,
            resources: [
              { name: 'Breathing', count: 5 },
              { name: 'Grounding', count: 3 },
            ],
          },
          {
            category: 'conversation',
            resourceCompletions: 2,
            resources: [{ name: 'Shame', count: 2 }],
          },
        ],
      },
      ga4: {
        overview: unavailable('x'),
        events: unavailable('x'),
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled',
    };
    const serialized = JSON.stringify(buildReportBlocks(payload));
    expect(serialized).toContain('*Resources completed*');
    expect(serialized).toContain('*Short videos* — 8 resource completions');
    expect(serialized).toContain('Breathing (5) · Grounding (3)');
    expect(serialized).toContain('*Conversations* — 2 resource completions');
  });

  it('caps children at 8 per group for weekly, but renders all for quarterly / yearly', () => {
    const manySessions = Array.from({ length: 12 }, (_, i) => ({
      name: `S${i + 1}`,
      count: 12 - i,
    }));
    const breakdowns = {
      completedCourses: [
        {
          name: 'Foundations',
          sessionCompletions: manySessions.reduce((s, r) => s + r.count, 0),
          courseCompletions: 0,
          sessions: manySessions,
        },
      ],
      completedResources: [],
    };
    const basePayload = {
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

    const weekly = JSON.stringify(buildReportBlocks({ ...basePayload, period: 'weekly' }));
    expect(weekly).toContain('+4 more'); // 12 total, 8 shown → +4
    expect(weekly).not.toContain('S9 (');

    const quarterly = JSON.stringify(
      buildReportBlocks({ ...basePayload, period: 'quarterly' }),
    );
    expect(quarterly).not.toContain('+4 more');
    expect(quarterly).toContain('S12 (1)'); // last-ranked session is rendered

    const yearly = JSON.stringify(buildReportBlocks({ ...basePayload, period: 'yearly' }));
    expect(yearly).not.toContain('+4 more');
    expect(yearly).toContain('S12 (1)');
  });

  it('renders anomalies at the top + baseline percent annotations on metrics', () => {
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
      },
      anomalies: [
        { source: 'db', label: 'New users', current: 30, mean: 10, sigma: 2.0 },
      ],
      trigger: 'scheduled',
    };
    const serialized = JSON.stringify(buildReportBlocks(payload));
    // Anomalies section at top with percent + qualitative flag (no sigma jargon).
    expect(serialized).toContain(':rotating_light:');
    expect(serialized).toContain('Worth looking at');
    expect(serialized).toContain('200% vs avg 10');
    expect(serialized).toContain('unusually high');
    expect(serialized).not.toContain('σ');
    // Metric annotation uses percent too.
    expect(serialized).toContain('↑ 200% vs avg 10');
  });

  it('renders conversion funnels when entry-step events have activity, skips when they don\'t', () => {
    const withActivity: ReportPayload = {
      period: 'weekly',
      window: baseWindow,
      db: fullDb,
      ga4: {
        overview: unavailable('x'),
        events: [
          { eventName: 'REGISTER_SUCCESS', eventCount: 84, totalUsers: 84 },
          { eventName: 'SIGNUP_SURVEY_COMPLETED', eventCount: 42, totalUsers: 42 },
        ],
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled',
    };
    const populated = JSON.stringify(buildReportBlocks(withActivity));
    expect(populated).toContain('Conversion funnels');
    expect(populated).toContain('Signup flow');
    expect(populated).toContain('Survey completed 42 (50%)');

    const empty: ReportPayload = {
      ...withActivity,
      ga4: { ...withActivity.ga4, events: [] },
    };
    expect(JSON.stringify(buildReportBlocks(empty))).not.toContain('Conversion funnels');
  });
});
