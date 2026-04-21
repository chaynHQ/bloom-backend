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
  deletedUsers: 0,
  coursesStarted: 0,
  coursesCompleted: 0,
  sessionsStarted: 0,
  sessionsCompleted: 0,
  resourcesStarted: 0,
  resourcesCompleted: 0,
  therapyBookingsBooked: 0,
  therapyBookingsCancelled: 0,
  therapyBookingsScheduledForPeriod: 0,
  partnerAccessGrants: 0,
  partnerAccessActivations: 0,
  whatsappSubscribed: 0,
  whatsappUnsubscribed: 0,
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

  it('claims an idempotency slot, collects both sources, posts to Slack, persists the metric snapshot', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-1' }] });
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 7 });
    dbMetrics.collectBreakdowns.mockResolvedValue({
      completedCourses: [
        {
          name: 'Foundations',
          sessionCompletions: 5,
          courseCompletions: 1,
          sessions: [{ name: 'Intro', count: 5 }],
        },
      ],
      completedResources: [],
    });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.sendMessageToReportingChannel.mockResolvedValue({ status: 200 } as never);

    const payload = await service.run('daily');

    expect(payload.runId).toBe('run-1');
    expect(payload.dbBreakdowns?.completedCourses[0].name).toBe('Foundations');
    expect(payload.dbBreakdowns?.completedCourses[0].sessions[0]).toEqual({
      name: 'Intro',
      count: 5,
    });
    expect(dbMetrics.collect).toHaveBeenCalledTimes(1);
    expect(dbMetrics.collectBreakdowns).toHaveBeenCalledTimes(1);
    expect(ga4Metrics.collect).toHaveBeenCalledWith(payload.window, 'daily');
    expect(slack.sendMessageToReportingChannel).toHaveBeenCalledTimes(1);
    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'run-1' },
      expect.objectContaining({ status: 'sent', newUsers: 7 }),
    );
  });

  it('short-circuits when the idempotency slot is already claimed (no collection, no Slack)', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [] });

    const payload = await service.run('daily');

    expect(payload.db).toMatchObject({ unavailable: true });
    expect(dbMetrics.collect).not.toHaveBeenCalled();
    expect(slack.sendMessageToReportingChannel).not.toHaveBeenCalled();
  });

  it('preserves the metric snapshot when Slack send fails', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-err' }] });
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 9 });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.sendMessageToReportingChannel.mockRejectedValue(new Error('webhook 500'));

    await service.run('weekly');

    expect(reportingRunRepo.update).toHaveBeenCalledWith(
      { id: 'run-err' },
      expect.objectContaining({ status: 'failed', error: 'webhook 500', newUsers: 9 }),
    );
  });

  it('loads a rolling baseline for monthly and surfaces top anomalies (>=2σ)', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-baseline' }] });
    // 4 prior months: newUsers stable around 10 (mean=10, stdDev=0 → no anomaly
    // on newUsers); sessionsStarted stable around 50 with σ=5 (so current=10
    // is 8σ below → anomaly).
    reportingRunRepo.find.mockResolvedValue([
      { newUsers: 10, sessionsStarted: 55, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 50, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 45, ga4Overview: null } as ReportingRunEntity,
      { newUsers: 10, sessionsStarted: 50, ga4Overview: null } as ReportingRunEntity,
    ]);
    dbMetrics.collect.mockResolvedValue({ ...fakeDb, newUsers: 10, sessionsStarted: 10 });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.sendMessageToReportingChannel.mockResolvedValue({ status: 200 } as never);

    const payload = await service.run('monthly');

    expect(payload.baseline).toBeDefined();
    expect(payload.baseline?.db.sessionsStarted?.mean).toBeCloseTo(50);
    expect(payload.anomalies?.length).toBeGreaterThan(0);
    expect(payload.anomalies?.[0].label).toBe('Sessions started');
    expect(payload.anomalies?.[0].sigma).toBeLessThan(-1); // directional: below baseline
  });

  it('collects state-of-Bloom totals for quarterly (and yearly) — skipped on daily/weekly/monthly', async () => {
    insertBuilder.execute.mockResolvedValue({ raw: [{ id: 'run-totals' }] });
    reportingRunRepo.find.mockResolvedValue([]);
    dbMetrics.collect.mockResolvedValue(fakeDb);
    dbMetrics.collectTotals.mockResolvedValue({
      liveUsers: 5234,
      activeWhatsappSubscribers: 312,
      activatedPartnerAccess: 124,
      totalSessionsCompleted: 48102,
      totalCoursesCompleted: 12889,
      totalResourcesCompleted: 2411,
      totalTherapyBookings: 3402,
    });
    ga4Metrics.collect.mockResolvedValue(fakeGa4);
    slack.sendMessageToReportingChannel.mockResolvedValue({ status: 200 } as never);

    const quarterly = await service.run('quarterly');
    expect(dbMetrics.collectTotals).toHaveBeenCalledTimes(1);
    expect(quarterly.dbTotals?.liveUsers).toBe(5234);

    (dbMetrics.collectTotals as jest.Mock).mockClear();
    const daily = await service.run('daily');
    expect(dbMetrics.collectTotals).not.toHaveBeenCalled();
    expect(daily.dbTotals).toBeUndefined();
  });
});
