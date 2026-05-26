import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ReportingRunEntity } from 'src/entities/reporting-run.entity';
import { Repository } from 'typeorm';
import { DbMetricsService } from './db-metrics.service';
import { Ga4MetricsService } from './ga4-metrics.service';
import { ReportingService } from './reporting.service';
import { DbMetrics, Ga4Metrics } from './reporting.types';

const fakeDb: DbMetrics = {
  newUsers: 1,
  newPartnerUsers: 0,
  deletedUsers: 0,
  activeUsers: 0,
  coursesStarted: 0,
  coursesCompleted: 0,
  sessionsStarted: 0,
  sessionsCompleted: 0,
  resourcesStarted: 0,
  resourcesCompleted: 0,
  therapyBookingsBooked: 0,
  therapyBookingsCancelled: 0,
  therapySessionsCompleted: 0,
  partnerAccessGrants: 0,
  partnerAccessActivations: 0,
  whatsappSubscribed: 0,
  whatsappUnsubscribed: 0,
  sessionFeedbackSubmitted: 0,
  resourceFeedbackSubmitted: 0,
  messagesSent: 0,
  messagesReceived: 0,
};

const emptyDbBreakdowns = {
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

const fakeGa4: Ga4Metrics = {
  overview: {
    activeUsers: 10,
    newUsers: 3,
    sessions: 12,
    screenPageViews: 40,
    averageSessionDuration: 45,
  },
  events: [{ eventName: 'page_view', eventCount: 40, totalUsers: 10 }],
  breakdowns: [],
  eventBreakdowns: [],
};

describe('ReportingService', () => {
  let service: ReportingService;
  let dbMetrics: jest.Mocked<DbMetricsService>;
  let ga4Metrics: jest.Mocked<Ga4MetricsService>;
  let slack: jest.Mocked<SlackMessageClient>;
  let reportingRunRepo: jest.Mocked<Repository<ReportingRunEntity>>;
  let insertBuilder: {
    insert: jest.Mock;
    into: jest.Mock;
    values: jest.Mock;
    orIgnore: jest.Mock;
    returning: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(async () => {
    dbMetrics = createMock<DbMetricsService>();
    ga4Metrics = createMock<Ga4MetricsService>();
    slack = createMock<SlackMessageClient>();
    reportingRunRepo = createMock<Repository<ReportingRunEntity>>();
    insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };
    (reportingRunRepo.createQueryBuilder as jest.Mock).mockReturnValue(insertBuilder);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: DbMetricsService, useValue: dbMetrics },
        { provide: Ga4MetricsService, useValue: ga4Metrics },
        { provide: SlackMessageClient, useValue: slack },
        { provide: getRepositoryToken(ReportingRunEntity), useValue: reportingRunRepo },
      ],
    }).compile();
    service = module.get(ReportingService);
  });

  it('weekly happy path: collects + breakdowns, posts parent then replies threaded on parent ts, persists snapshot', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-1' }] });
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 7 });
    dbMetrics.collectBreakdowns.mockResolvedValue({
      ...emptyDbBreakdowns,
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
    });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.postReportingMessage.mockResolvedValue({
      ts: '1700000000.000001',
      channel: 'C123',
    } as never);

    const payload = await service.run('weekly', { bypassIdempotency: false });

    expect(payload.runId).toBe('run-1');
    expect(payload.dbBreakdowns?.courses[0].name).toBe('Foundations');
    // Parent posts first (no threadTs); subsequent calls reply on parent ts.
    expect(slack.postReportingMessage.mock.calls[0][1]?.threadTs).toBeUndefined();
    const replyCalls = slack.postReportingMessage.mock.calls.slice(1);
    expect(replyCalls.length).toBeGreaterThan(0);
    for (const [, opts] of replyCalls) {
      expect(opts?.threadTs).toBe('1700000000.000001');
    }
    // Snapshot persisted with metric columns + JSONB blobs + slackTs.
    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'run-1' },
      expect.objectContaining({
        status: 'sent',
        slackTs: '1700000000.000001',
        newUsers: 7,
        dbBreakdowns: expect.objectContaining({ courses: expect.any(Array) }),
        ga4Overview: expect.any(Object),
      }),
    );
  });

  it('skips work when the idempotency slot is already claimed (prod insert returned empty)', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [] });

    const payload = await service.run('daily', { bypassIdempotency: false });

    // Renderer-friendly all-null DbMetrics returned so the caller doesn't
    // need a separate "skipped" branch.
    expect(payload.db.newUsers).toBeNull();
    expect(dbMetrics.collect).not.toHaveBeenCalled();
    expect(slack.postReportingMessage).not.toHaveBeenCalled();
  });

  it('Slack failure marks the run failed but still persists the metric snapshot', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-err' }] });
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 9 });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.postReportingMessage.mockRejectedValue(new Error('webhook 500'));

    await service.run('weekly', { bypassIdempotency: false });

    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'run-err' },
      expect.objectContaining({ status: 'failed', error: 'webhook 500', newUsers: 9 }),
    );
  });

  it('daily skips breakdowns and surfaces the outage watchlist (today=0 with prior ≥ floor)', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-outage' }] });
    // 3 prior daily runs comfortably above OUTAGE_PRIOR_FLOOR (5). Today's 0
    // for active/new users is the canonical "tracking pipeline down" signal.
    reportingRunRepo.find.mockResolvedValue([
      { activeUsers: 40, newUsers: 8, ga4Overview: null } as ReportingRunEntity,
      { activeUsers: 38, newUsers: 5, ga4Overview: null } as ReportingRunEntity,
      { activeUsers: 42, newUsers: 6, ga4Overview: null } as ReportingRunEntity,
    ]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, activeUsers: 0, newUsers: 0 });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.postReportingMessage.mockResolvedValue({ ts: '1', channel: 'C' } as never);

    const payload = await service.run('daily', { bypassIdempotency: false });

    // Daily strips topic detail — the heavy GROUP BY joins are skipped.
    expect(dbMetrics.collectBreakdowns).not.toHaveBeenCalled();
    // Outage anomalies use sigma=0 as a renderer sentinel ("tracking down?").
    const labels = (payload.anomalies ?? []).map((a) => a.label);
    expect(labels).toEqual(expect.arrayContaining(['Active users', 'New users']));
    expect(payload.anomalies?.[0].sigma).toBe(0);
  });

  it('weekly with ≥3 priors loads a rolling baseline and surfaces top anomalies', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-baseline' }] });
    // sessionsStarted stable around 50 with σ=5 → current=10 is ~8σ below.
    reportingRunRepo.find.mockResolvedValue([
      { newUsers: 10, sessionsStarted: 55, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 50, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 45, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 50, ga4Overview: null } as ReportingRunEntity,
    ]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 10, sessionsStarted: 10 });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.postReportingMessage.mockResolvedValue({ ts: '1', channel: 'C' } as never);

    const payload = await service.run('monthly', { bypassIdempotency: false });

    expect(payload.baseline?.db.sessionsStarted?.mean).toBeCloseTo(50);
    expect(payload.anomalies?.[0].label).toBe('Sessions started');
    expect(payload.anomalies?.[0].sigma).toBeLessThan(-1);
  });

  it('off-prod bypass: existing failed slot is replayed; existing sent slot reused without resetting status', async () => {
    // First call: stale failed row → flipped back to pending, replayed.
    reportingRunRepo.findOne.mockResolvedValueOnce({
      id: 'existing-run',
      status: 'failed',
    } as ReportingRunEntity);
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue(fakeDb);
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.postReportingMessage.mockResolvedValue({ ts: '1', channel: 'C' } as never);

    await service.run('weekly');

    expect(insertBuilder.execute).not.toHaveBeenCalled();
    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'existing-run' },
      { status: 'pending', error: null },
    );

    // Second call: sent row — must NOT be reset to pending (snapshot is the
    // canonical baseline source for future runs).
    reportingRunRepo.findOne.mockResolvedValueOnce({
      id: 'sent-run',
      status: 'sent',
    } as ReportingRunEntity);
    (reportingRunRepo.update as jest.Mock).mockClear();

    await service.run('weekly');

    expect(reportingRunRepo.update).not.toHaveBeenCalledWith(
      { id: 'sent-run' },
      { status: 'pending', error: null },
    );
    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'sent-run' },
      expect.objectContaining({ status: 'sent' }),
    );
  });
});
