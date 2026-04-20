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
  therapyBookingsBooked: 5,
  therapyBookingsCancelled: 1,
  therapyBookingsScheduledForPeriod: 7,
  partnerAccessGrants: 4,
  partnerAccessActivations: 2,
};

const unavailable = (reason: string) => ({ unavailable: true as const, reason });

describe('buildReportBlocks', () => {
  it('renders a full weekly digest (snapshot) — DB, GA4 overview, grouped events, per-line breakdowns, global breakdowns', () => {
    const payload: ReportPayload = {
      period: 'weekly',
      window: {
        from: new Date('2026-04-12T23:00:00.000Z'),
        to: new Date('2026-04-19T22:59:59.999Z'),
        label: '2026-W16',
        timezone: 'Europe/London',
      },
      db: fullDb,
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
        eventBreakdowns: [
          {
            lineLabel: 'Session video',
            paramApiName: 'customEvent:session_name',
            paramLabel: 'session',
            rows: [{ value: 'Healing from trauma', eventCount: 18, totalUsers: 16 }],
          },
        ],
      },
      trigger: 'manual',
      runId: 'run-123',
    };
    expect(buildReportBlocks(payload)).toMatchSnapshot();
  });

  it('daily variant strips per-line breakdowns and the global breakdowns section', () => {
    const payload: ReportPayload = {
      period: 'daily',
      window: baseWindow,
      db: fullDb,
      ga4: {
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
      },
      trigger: 'scheduled',
    };
    const serialized = JSON.stringify(buildReportBlocks(payload));
    expect(serialized).not.toContain('↳');
    expect(serialized).not.toContain(':mag: GA4 breakdowns');
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
