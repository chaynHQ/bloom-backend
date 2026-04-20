import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, Not, Repository } from 'typeorm';
import { DbMetrics, ReportWindow } from './reporting.types';

@Injectable()
export class DbMetricsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseUserEntity)
    private readonly courseUserRepository: Repository<CourseUserEntity>,
    @InjectRepository(SessionUserEntity)
    private readonly sessionUserRepository: Repository<SessionUserEntity>,
    @InjectRepository(TherapySessionEntity)
    private readonly therapySessionRepository: Repository<TherapySessionEntity>,
    @InjectRepository(PartnerAccessEntity)
    private readonly partnerAccessRepository: Repository<PartnerAccessEntity>,
  ) {}

  async collect({ from, to }: ReportWindow): Promise<DbMetrics> {
    const range = Between(from, to);

    const [
      newUsers,
      deletedUsers,
      coursesStarted,
      coursesCompleted,
      sessionsStarted,
      sessionsCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapyBookingsScheduledForPeriod,
      partnerAccessGrants,
      partnerAccessActivations,
    ] = await Promise.all([
      this.userRepository.count({ where: { createdAt: range } }),
      this.userRepository.count({ where: { deletedAt: range } }),
      this.courseUserRepository.count({ where: { createdAt: range } }),
      this.courseUserRepository.count({ where: { completedAt: range } }),
      this.sessionUserRepository.count({ where: { createdAt: range } }),
      this.sessionUserRepository.count({ where: { completedAt: range } }),
      this.therapySessionRepository.count({
        where: { createdAt: range },
      }),
      this.therapySessionRepository.count({
        where: { cancelledAt: range },
      }),
      this.therapySessionRepository.count({
        where: { startDateTime: range, action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) },
      }),
      this.partnerAccessRepository.count({ where: { createdAt: range } }),
      this.partnerAccessRepository.count({ where: { activatedAt: range } }),
    ]);

    return {
      newUsers,
      deletedUsers,
      coursesStarted,
      coursesCompleted,
      sessionsStarted,
      sessionsCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapyBookingsScheduledForPeriod,
      partnerAccessGrants,
      partnerAccessActivations,
    };
  }
}
