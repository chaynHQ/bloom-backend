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
  newPartnerUsers: 8,
  deletedUsers: 1,
  activeUsers: 540,
  coursesStarted: 8,
  coursesCompleted: 3,
  sessionsStarted: 24,
  sessionsCompleted: 9,
  resourcesStarted: 14,
  resourcesCompleted: 7,
  therapyBookingsBooked: 5,
  therapyBookingsCancelled: 1,
  therapySessionsCompleted: 7,
  partnerAccessGrants: 4,
  partnerAccessActivations: 2,
  whatsappSubscribed: 6,
  whatsappUnsubscribed: 1,
  sessionFeedbackSubmitted: 5,
  resourceFeedbackSubmitted: 3,
  messagesSent: 18,
  messagesReceived: 22,
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
  it('renders a full weekly digest (snapshot covers structure, breakdowns, GA events + sub-row breakdowns, anomalies, baselines)', () => {
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
        sessionFeedbackByTag: [{ name: 'useful', count: 3 }],
        resourceFeedbackByTag: [{ name: 'relatable', count: 3 }],
        therapyByTherapist: [{ name: 'Dr Jane Smith', count: 4 }],
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
          { eventName: 'VALIDATE_ACCESS_CODE_INVALID', eventCount: 14, totalUsers: 9 },
          { eventName: 'LOGIN_ERROR', eventCount: 3, totalUsers: 3 },
        ],
        breakdowns: [
          {
            apiName: 'pagePath',
            displayName: 'Top pages',
            rows: [{ value: '/courses', eventCount: 500, totalUsers: 200 }],
          },
        ],
        eventBreakdowns: [
          {
            lineLabel: 'Partner access codes',
            paramApiName: 'customEvent:partner',
            paramLabel: 'partner',
            rows: [
              { value: 'badcode-org', eventCount: 9, totalUsers: 6 },
              { value: 'oldcode', eventCount: 4, totalUsers: 3 },
            ],
          },
        ],
      },
      baseline: {
        sampleSize: 4,
        db: { newUsers: { mean: 10, stdDev: 2, sampleSize: 4 } },
        ga4Overview: {},
        ga4Events: {},
      },
      anomalies: [{ source: 'db', label: 'New users', current: 12, mean: 10, sigma: 2.1 }],
      trigger: 'manual',
      runId: 'run-123',
    };
    expect(buildReportBlocks(payload)).toMatchSnapshot();
  });

  it('daily renders the lighter snapshot title, trims headline to 6 cells, and drops per-topic replies', () => {
    const blocks = buildReportBlocks({
      period: 'daily',
      window: baseWindow,
      db: fullDb,
      dbBreakdowns: emptyBreakdowns,
      ga4: {
        overview: {
          activeUsers: 10,
          newUsers: 3,
          sessions: 12,
          screenPageViews: 40,
          averageSessionDuration: 45,
        },
        events: [],
        breakdowns: [],
        eventBreakdowns: [],
      },
      trigger: 'scheduled',
    });

    expect(blocks[0]).toEqual({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Bloom daily snapshot* — 2026-04-20 (Europe/London)',
      },
    });
    const serialized = JSON.stringify(blocks);
    expect(serialized).not.toContain('"type":"header"');
    // 6 headline cells render; trimmed-off ones do not.
    expect(serialized).toContain('*New users*');
    expect(serialized).toContain('*Messages sent*');
    expect(serialized).not.toContain('*Sessions started*');
    // Per-topic replies are dropped on daily.
    expect(serialized).not.toContain('Users & accounts');
    expect(serialized).not.toContain(':warning: Errors');
  });

  it('renders N/A for null DB metrics (distinct from a real zero)', () => {
    const serialized = JSON.stringify(
      buildReportBlocks({
        period: 'weekly',
        window: baseWindow,
        db: { ...fullDb, newUsers: null, coursesStarted: null },
        ga4: {
          overview: unavailable('x'),
          events: [],
          breakdowns: [],
          eventBreakdowns: [],
        },
        trigger: 'scheduled',
      }),
    );
    expect(serialized).toContain('*New users*\\nN/A');
    expect(serialized).toContain('*Courses started*\\nN/A');
    expect(serialized).toContain('*Courses completed*\\n3');
  });

  it('outage anomaly (sigma=0) renders as "tracking down?"; synthetic baseline renders "vs prior" not "vs avg"', () => {
    // Outage sentinel — sigma=0, current=0 is set by computeOutageAnomalies.
    const outage = JSON.stringify(
      buildReportBlocks({
        period: 'daily',
        window: baseWindow,
        db: { ...fullDb, activeUsers: 0 },
        ga4: {
          overview: unavailable('x'),
          events: [],
          breakdowns: [],
          eventBreakdowns: [],
        },
        anomalies: [{ source: 'db', label: 'Active users', current: 0, mean: 42, sigma: 0 }],
        trigger: 'scheduled',
      }),
    );
    expect(outage).toContain('expected ~42 — tracking down?');
    expect(outage).not.toContain('↓ 100% vs avg 42');

    // Synthetic single-sample baseline — sampleSize=1, stdDev=0 → "vs prior".
    const synthetic = JSON.stringify(
      buildReportBlocks({
        period: 'yearly',
        window: baseWindow,
        db: { ...fullDb, newUsers: 1000 },
        ga4: {
          overview: unavailable('x'),
          events: [],
          breakdowns: [],
          eventBreakdowns: [],
        },
        baseline: {
          sampleSize: 1,
          db: { newUsers: { mean: 800, stdDev: 0, sampleSize: 1 } },
          ga4Overview: {},
          ga4Events: {},
        },
        trigger: 'scheduled',
      }),
    );
    expect(synthetic).toContain('↑ 25% vs prior 800');
    expect(synthetic).toContain('baseline: vs prior period');
  });

  it('caps breakdown children at 8 for weekly (+N more); uncapped for quarterly', () => {
    const manySessions = Array.from({ length: 12 }, (_, i) => ({
      name: `S${i + 1}`,
      started: (12 - i) * 2,
      completed: 12 - i,
    }));
    const base = {
      window: baseWindow,
      db: fullDb,
      dbBreakdowns: {
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
      },
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
      '*Foundations: S12*\\n2 started · 1 completed',
    );
  });
});
