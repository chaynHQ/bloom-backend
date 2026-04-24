import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Between, IsNull, Repository } from 'typeorm';
import { DbMetricsService } from './db-metrics.service';
import { ReportWindow } from './reporting.types';

describe('DbMetricsService', () => {
  it('collects DB metrics including new feedback + therapy fields, with the WhatsApp filter scoped to the right subscription', async () => {
    const userRepo = createMock<Repository<UserEntity>>();
    const courseUserRepo = createMock<Repository<CourseUserEntity>>();
    const sessionUserRepo = createMock<Repository<SessionUserEntity>>();
    const therapyRepo = createMock<Repository<TherapySessionEntity>>();
    const partnerAccessRepo = createMock<Repository<PartnerAccessEntity>>();
    const subscriptionUserRepo = createMock<Repository<SubscriptionUserEntity>>();
    const resourceUserRepo = createMock<Repository<ResourceUserEntity>>();
    const sessionFeedbackRepo = createMock<Repository<SessionFeedbackEntity>>();
    const resourceFeedbackRepo = createMock<Repository<ResourceFeedbackEntity>>();

    let call = 0;
    const nextCount = async () => ++call;
    [
      userRepo,
      courseUserRepo,
      sessionUserRepo,
      therapyRepo,
      partnerAccessRepo,
      resourceUserRepo,
      sessionFeedbackRepo,
      resourceFeedbackRepo,
    ].forEach((r) => (r.count as unknown as jest.Mock).mockImplementation(nextCount));

    // WhatsApp counts use a query-builder join so they can filter on
    // subscription.name. The join + where shape is the critical regression
    // guard — easy to break, hard to spot at runtime.
    const subsQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockImplementation(async () => ++call),
    };
    (subscriptionUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(subsQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbMetricsService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(CourseUserEntity), useValue: courseUserRepo },
        { provide: getRepositoryToken(SessionUserEntity), useValue: sessionUserRepo },
        { provide: getRepositoryToken(TherapySessionEntity), useValue: therapyRepo },
        { provide: getRepositoryToken(PartnerAccessEntity), useValue: partnerAccessRepo },
        { provide: getRepositoryToken(SubscriptionUserEntity), useValue: subscriptionUserRepo },
        { provide: getRepositoryToken(ResourceUserEntity), useValue: resourceUserRepo },
        { provide: getRepositoryToken(SessionFeedbackEntity), useValue: sessionFeedbackRepo },
        { provide: getRepositoryToken(ResourceFeedbackEntity), useValue: resourceFeedbackRepo },
      ],
    }).compile();

    const window: ReportWindow = {
      from: new Date('2026-04-19T23:00:00.000Z'),
      to: new Date('2026-04-20T22:59:59.999Z'),
      label: '2026-04-20',
      timezone: 'Europe/London',
    };
    const metrics = await module.get(DbMetricsService).collect(window);

    expect(Object.values(metrics).every((v) => typeof v === 'number')).toBe(true);
    expect(typeof metrics.sessionFeedbackSubmitted).toBe('number');
    expect(typeof metrics.resourceFeedbackSubmitted).toBe('number');

    // Soft-delete guard on newUsers and the WhatsApp subscription-name filter
    // are both regression-prone; lock them in.
    expect(userRepo.count).toHaveBeenCalledWith({
      where: { createdAt: Between(window.from, window.to), deletedAt: IsNull() },
    });
    expect(subsQb.innerJoin).toHaveBeenCalledWith('su.subscription', 's');
    expect(subsQb.where).toHaveBeenCalledWith('s.name = :name', { name: 'whatsapp' });
  });

  it('collectBreakdowns nests sessions under courses and resources under category, with started + completed per row', async () => {
    const repos = {
      sessionUser: createMock<Repository<SessionUserEntity>>(),
      courseUser: createMock<Repository<CourseUserEntity>>(),
      resourceUser: createMock<Repository<ResourceUserEntity>>(),
      user: createMock<Repository<UserEntity>>(),
      partnerAccess: createMock<Repository<PartnerAccessEntity>>(),
      sessionFeedback: createMock<Repository<SessionFeedbackEntity>>(),
      resourceFeedback: createMock<Repository<ResourceFeedbackEntity>>(),
      therapy: createMock<Repository<TherapySessionEntity>>(),
      subscriptionUser: createMock<Repository<SubscriptionUserEntity>>(),
    };

    const stub = <T>(rows: T[]) => ({
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
      getRawMany: jest.fn().mockResolvedValue(rows),
    });

    (repos.sessionUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stub([
        { courseName: 'Foundations', sessionName: 'Intro', started: '9', completed: '5' },
        { courseName: 'Healing', sessionName: 'Safety', started: '6', completed: '4' },
        {
          courseName: 'Foundations',
          sessionName: 'Reflection',
          started: '4',
          completed: '3',
        },
      ]),
    );
    (repos.courseUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stub([{ courseName: 'Foundations', started: '5', completed: '2' }]),
    );
    (repos.resourceUser.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stub([
        { category: 'short_video', resourceName: 'Breathing', started: '9', completed: '6' },
        { category: 'conversation', resourceName: 'Shame', started: '5', completed: '3' },
      ]),
    );

    // The remaining QB-driven breakdowns aren't the focus of this test —
    // return empty rows so the call succeeds without per-query assertions.
    [
      repos.user,
      repos.partnerAccess,
      repos.sessionFeedback,
      repos.resourceFeedback,
      repos.therapy,
    ].forEach((r) =>
      (r.createQueryBuilder as unknown as jest.Mock).mockReturnValue(stub([])),
    );

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
      ],
    }).compile();

    const breakdowns = await module.get(DbMetricsService).collectBreakdowns({
      from: new Date('2026-04-19T23:00:00.000Z'),
      to: new Date('2026-04-20T22:59:59.999Z'),
      label: '2026-04-20',
      timezone: 'Europe/London',
    });

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
    expect(breakdowns.resources[0].resources[0]).toMatchObject({
      name: 'Breathing',
      started: 9,
      completed: 6,
    });
    // New per-topic breakdown shapes exist on the return type even when empty.
    expect(breakdowns.newUsersByPartner).toEqual([]);
    expect(breakdowns.sessionFeedbackByTag).toEqual([]);
    expect(breakdowns.therapyByTherapist).toEqual([]);
  });
});
