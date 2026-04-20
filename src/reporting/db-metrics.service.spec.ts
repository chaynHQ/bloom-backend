import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, Not, Repository } from 'typeorm';
import { DbMetricsService } from './db-metrics.service';
import { ReportWindow } from './reporting.types';

describe('DbMetricsService', () => {
  it('collects all 11 metrics with the right date-range + action filters on each repo', async () => {
    const userRepo = createMock<Repository<UserEntity>>();
    const courseUserRepo = createMock<Repository<CourseUserEntity>>();
    const sessionUserRepo = createMock<Repository<SessionUserEntity>>();
    const therapyRepo = createMock<Repository<TherapySessionEntity>>();
    const partnerAccessRepo = createMock<Repository<PartnerAccessEntity>>();

    let call = 0;
    const nextCount = async () => ++call;
    (userRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (courseUserRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (sessionUserRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (therapyRepo.count as unknown as jest.Mock).mockImplementation(nextCount);
    (partnerAccessRepo.count as unknown as jest.Mock).mockImplementation(nextCount);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbMetricsService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(CourseUserEntity), useValue: courseUserRepo },
        { provide: getRepositoryToken(SessionUserEntity), useValue: sessionUserRepo },
        { provide: getRepositoryToken(TherapySessionEntity), useValue: therapyRepo },
        { provide: getRepositoryToken(PartnerAccessEntity), useValue: partnerAccessRepo },
      ],
    }).compile();

    const window: ReportWindow = {
      from: new Date('2026-04-19T23:00:00.000Z'),
      to: new Date('2026-04-20T22:59:59.999Z'),
      label: '2026-04-20',
      timezone: 'Europe/London',
    };
    const metrics = await module.get(DbMetricsService).collect(window);

    // All 11 metrics returned as numbers.
    expect(Object.values(metrics).every((v) => typeof v === 'number')).toBe(true);

    // Spot-check the filter shape on each repo — covers the non-obvious
    // therapy action filter in particular.
    const range = Between(window.from, window.to);
    expect(userRepo.count).toHaveBeenCalledWith({ where: { createdAt: range } });
    expect(userRepo.count).toHaveBeenCalledWith({ where: { deletedAt: range } });
    expect(courseUserRepo.count).toHaveBeenCalledWith({ where: { completedAt: range } });
    expect(sessionUserRepo.count).toHaveBeenCalledWith({ where: { completedAt: range } });
    expect(therapyRepo.count).toHaveBeenCalledWith({
      where: { startDateTime: range, action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) },
    });
    expect(partnerAccessRepo.count).toHaveBeenCalledWith({ where: { activatedAt: range } });
  });
});
