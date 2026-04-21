import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { DbMetricsService } from './db-metrics.service';
import { ReportWindow } from './reporting.types';

describe('DbMetricsService', () => {
  it('collects all DB metrics with the right date-range + action filters on each repo', async () => {
    const userRepo = createMock<Repository<UserEntity>>();
    const courseUserRepo = createMock<Repository<CourseUserEntity>>();
    const sessionUserRepo = createMock<Repository<SessionUserEntity>>();
    const therapyRepo = createMock<Repository<TherapySessionEntity>>();
    const partnerAccessRepo = createMock<Repository<PartnerAccessEntity>>();
    const subscriptionUserRepo = createMock<Repository<SubscriptionUserEntity>>();
    const resourceUserRepo = createMock<Repository<ResourceUserEntity>>();

    let call = 0;
    const nextCount = async () => ++call;
    (userRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (courseUserRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (sessionUserRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (therapyRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (partnerAccessRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (resourceUserRepo.count as unknown as jest.Mock).mockImplementation(nextCount);

    // WhatsApp metrics use a query-builder .getCount() join (filtered by
    // subscription.name = 'whatsapp'), not repo.count().
    const subsCountQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockImplementation(async () => ++call),
    };

    const stubBreakdownQuery = <T>(rows: T[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    });
    (sessionUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stubBreakdownQuery([
        { courseName: 'Foundations', sessionName: 'Intro', count: '5' },
        { courseName: 'Healing', sessionName: 'Safety', count: '4' },
        { courseName: 'Foundations', sessionName: 'Reflection', count: '3' },
        { courseName: 'Healing', sessionName: 'Resourcing', count: '2' },
      ]),
    );
    (courseUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stubBreakdownQuery([
        { courseName: 'Foundations', count: '2' },
        { courseName: 'Healing', count: '1' },
      ]),
    );
    (subscriptionUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      subsCountQb,
    );
    (resourceUserRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
      stubBreakdownQuery([
        { category: 'short_video', resourceName: 'Breathing', count: '6' },
        { category: 'conversation', resourceName: 'Shame', count: '3' },
        { category: 'short_video', resourceName: 'Grounding', count: '2' },
      ]),
    );

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
      ],
    }).compile();

    const window: ReportWindow = {
      from: new Date('2026-04-19T23:00:00.000Z'),
      to: new Date('2026-04-20T22:59:59.999Z'),
      label: '2026-04-20',
      timezone: 'Europe/London',
    };
    const service = module.get(DbMetricsService);
    const metrics = await service.collect(window);

    // All DB metrics returned as numbers (including whatsappSubscribed/Unsubscribed).
    expect(Object.values(metrics).every((v) => typeof v === 'number')).toBe(true);
    expect(typeof metrics.whatsappSubscribed).toBe('number');
    expect(typeof metrics.whatsappUnsubscribed).toBe('number');

    // WhatsApp counts filter by the parent Subscription name — critical so
    // we don't accidentally count future subscription types.
    expect(subsCountQb.innerJoin).toHaveBeenCalledWith('su.subscription', 's');
    expect(subsCountQb.where).toHaveBeenCalledWith('s.name = :name', { name: 'whatsapp' });

    // Totals: same repos are reused — only assertion we care about here is
    // that every field is a number and query plumbing runs clean. The
    // counters return incrementing values via the shared nextCount mock.
    const totals = await service.collectTotals(new Date('2026-04-20T00:00:00Z'));
    expect(Object.values(totals).every((v) => typeof v === 'number')).toBe(true);

    // Breakdowns: courses are the outer grouping; session completions nest
    // under their parent course. Foundations wins the outer sort because its
    // session completions (5+3=8) exceed Healing's (4+2=6).
    const breakdowns = await service.collectBreakdowns(window);
    expect(breakdowns.completedCourses).toEqual([
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
        name: 'Healing',
        sessionCompletions: 6,
        courseCompletions: 1,
        sessions: [
          { name: 'Safety', count: 4 },
          { name: 'Resourcing', count: 2 },
        ],
      },
    ]);

    // Resource breakdowns nest by category. short_video wins (6+2=8 > 3).
    expect(breakdowns.completedResources).toEqual([
      {
        category: 'short_video',
        resourceCompletions: 8,
        resources: [
          { name: 'Breathing', count: 6 },
          { name: 'Grounding', count: 2 },
        ],
      },
      {
        category: 'conversation',
        resourceCompletions: 3,
        resources: [{ name: 'Shame', count: 3 }],
      },
    ]);

    // Spot-check the filter shape on each repo — covers the non-obvious
    // therapy action filter and the soft-delete guard on newUsers.
    const range = Between(window.from, window.to);
    expect(userRepo.count).toHaveBeenCalledWith({
      where: { createdAt: range, deletedAt: IsNull() },
    });
    expect(userRepo.count).toHaveBeenCalledWith({ where: { deletedAt: range } });
    expect(courseUserRepo.count).toHaveBeenCalledWith({ where: { completedAt: range } });
    expect(sessionUserRepo.count).toHaveBeenCalledWith({ where: { completedAt: range } });
    expect(resourceUserRepo.count).toHaveBeenCalledWith({ where: { createdAt: range } });
    expect(resourceUserRepo.count).toHaveBeenCalledWith({ where: { completedAt: range } });
    expect(therapyRepo.count).toHaveBeenCalledWith({
      where: { startDateTime: range, action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) },
    });
    expect(partnerAccessRepo.count).toHaveBeenCalledWith({ where: { activatedAt: range } });
  });
});
