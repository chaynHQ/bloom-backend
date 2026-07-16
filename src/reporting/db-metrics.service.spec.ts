import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { DbMetricsService } from './db-metrics.service';
import { ReportWindow } from './reporting.types';

const window: ReportWindow = {
  from: new Date('2026-04-19T23:00:00.000Z'),
  to: new Date('2026-04-20T22:59:59.999Z'),
  label: '2026-04-20',
  timezone: 'Europe/London',
};

function qbStub<T>(rows: T[] = [], count = 0) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

async function makeService(overrides: Partial<Record<string, unknown>> = {}) {
  const repos = {
    user: createMock<Repository<UserEntity>>(),
    courseUser: createMock<Repository<CourseUserEntity>>(),
    sessionUser: createMock<Repository<SessionUserEntity>>(),
    therapy: createMock<Repository<TherapySessionEntity>>(),
    partnerAccess: createMock<Repository<PartnerAccessEntity>>(),
    subscriptionUser: createMock<Repository<SubscriptionUserEntity>>(),
    resourceUser: createMock<Repository<ResourceUserEntity>>(),
    sessionFeedback: createMock<Repository<SessionFeedbackEntity>>(),
    resourceFeedback: createMock<Repository<ResourceFeedbackEntity>>(),
    eventLog: createMock<Repository<EventLogEntity>>(),
    ...overrides,
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DbMetricsService,
      { provide: getRepositoryToken(UserEntity), useValue: repos.user },
      { provide: getRepositoryToken(CourseUserEntity), useValue: repos.courseUser },
      { provide: getRepositoryToken(SessionUserEntity), useValue: repos.sessionUser },
      { provide: getRepositoryToken(TherapySessionEntity), useValue: repos.therapy },
      { provide: getRepositoryToken(PartnerAccessEntity), useValue: repos.partnerAccess },
      { provide: getRepositoryToken(SubscriptionUserEntity), useValue: repos.subscriptionUser },
      { provide: getRepositoryToken(ResourceUserEntity), useValue: repos.resourceUser },
      { provide: getRepositoryToken(SessionFeedbackEntity), useValue: repos.sessionFeedback },
      { provide: getRepositoryToken(ResourceFeedbackEntity), useValue: repos.resourceFeedback },
      { provide: getRepositoryToken(EventLogEntity), useValue: repos.eventLog },
    ],
  }).compile();

  return { service: module.get(DbMetricsService), repos };
}

describe('DbMetricsService', () => {
  it('collect: every metric reports a number; a failing repo nulls only its own keys; soft-delete + whatsapp filter are wired', async () => {
    const { service, repos } = await makeService();

    // All count()-based metrics resolve to 1 except courseUser, which throws —
    // proves per-metric isolation (null on coursesStarted/Completed only).
    [
      repos.user,
      repos.sessionUser,
      repos.therapy,
      repos.partnerAccess,
      repos.resourceUser,
      repos.sessionFeedback,
      repos.resourceFeedback,
      repos.eventLog,
    ].forEach((r) => ((r as Repository<unknown>).count as unknown as jest.Mock).mockResolvedValue(1));
    ((repos.courseUser as Repository<unknown>).count as unknown as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );

    // newPartnerUsers uses a QB on userRepo; whatsapp uses a QB on
    // subscriptionUserRepo with a subscription-name filter. Both are
    // regression-prone shapes, lock them in.
    const userQb = qbStub([], 3);
    (repos.user.createQueryBuilder as unknown as jest.Mock).mockReturnValue(userQb);
    const subsQb = qbStub([], 2);
    (repos.subscriptionUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(subsQb);

    const metrics = await service.collect(window);

    // Failed repo → null on its two keys only.
    expect(metrics.coursesStarted).toBeNull();
    expect(metrics.coursesCompleted).toBeNull();
    // Everything else is a real number.
    expect(metrics.newUsers).toBe(1);
    expect(metrics.sessionsStarted).toBe(1);
    expect(metrics.newPartnerUsers).toBe(3);
    expect(metrics.whatsappSubscribed).toBe(2);

    // Soft-delete guard on newUsers — easy to drop, hard to spot at runtime.
    expect(repos.user.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: IsNull() }) }),
    );
    // Whatsapp filter scoped to the right subscription name.
    expect(subsQb.where).toHaveBeenCalledWith('s.name = :name', { name: 'whatsapp' });

    // Chat message counts MUST window on `date` (Front's emit time), not
    // `createdAt` (row-insert time) — the two diverge for backfilled/migrated
    // and delayed-webhook rows, which silently zeroed these metrics before.
    expect(repos.eventLog.count).toHaveBeenCalledWith({
      where: { event: EVENT_NAME.CHAT_MESSAGE_SENT, date: expect.anything() },
    });
    expect(repos.eventLog.count).toHaveBeenCalledWith({
      where: { event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: expect.anything() },
    });
    expect(repos.eventLog.count).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.anything() }) }),
    );
  });

  it('collectBreakdowns: courses nest sessions under course name; resources nest items under category', async () => {
    const { service, repos } = await makeService();

    (repos.sessionUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      qbStub([
        { courseName: 'Foundations', sessionName: 'Intro', started: '9', completed: '5' },
        { courseName: 'Foundations', sessionName: 'Reflection', started: '4', completed: '3' },
        { courseName: 'Healing', sessionName: 'Safety', started: '6', completed: '4' },
      ]),
    );
    (repos.courseUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      qbStub([{ courseName: 'Foundations', started: '5', completed: '2' }]),
    );
    (repos.resourceUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      qbStub([
        { category: 'short_video', resourceName: 'Breathing', started: '9', completed: '6' },
      ]),
    );
    // Remaining QB-backed breakdowns aren't the focus — return empty.
    [
      repos.user,
      repos.partnerAccess,
      repos.sessionFeedback,
      repos.resourceFeedback,
      repos.therapy,
    ].forEach((r) =>
      ((r as Repository<unknown>).createQueryBuilder as unknown as jest.Mock).mockReturnValue(qbStub([])),
    );

    const breakdowns = await service.collectBreakdowns(window);

    expect(breakdowns.courses[0]).toMatchObject({
      name: 'Foundations',
      coursesStarted: 5,
      coursesCompleted: 2,
      sessionsStarted: 13,
      sessionsCompleted: 8,
    });
    expect(breakdowns.courses[0].sessions[0]).toMatchObject({
      name: 'Intro',
      started: 9,
      completed: 5,
    });
    expect(breakdowns.resources[0]).toMatchObject({
      category: 'short_video',
      resourcesStarted: 9,
      resourcesCompleted: 6,
    });
  });
});
