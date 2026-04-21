import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import {
  DbBreakdowns,
  DbMetrics,
  DbResourceCategoryBreakdownRow,
  DbTotals,
  ReportWindow,
} from './reporting.types';

/** Must match the seeded subscription.name (see
 *  SubscriptionUserService.createWhatsappSubscription). */
const WHATSAPP_SUBSCRIPTION_NAME = 'whatsapp';

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
    @InjectRepository(SubscriptionUserEntity)
    private readonly subscriptionUserRepository: Repository<SubscriptionUserEntity>,
    @InjectRepository(ResourceUserEntity)
    private readonly resourceUserRepository: Repository<ResourceUserEntity>,
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
      resourcesStarted,
      resourcesCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapyBookingsScheduledForPeriod,
      partnerAccessGrants,
      partnerAccessActivations,
      whatsappSubscribed,
      whatsappUnsubscribed,
    ] = await Promise.all([
      // "New users" = net-new retained accounts; exclude any soft-deleted since.
      this.userRepository.count({ where: { createdAt: range, deletedAt: IsNull() } }),
      this.userRepository.count({ where: { deletedAt: range } }),
      this.courseUserRepository.count({ where: { createdAt: range } }),
      this.courseUserRepository.count({ where: { completedAt: range } }),
      this.sessionUserRepository.count({ where: { createdAt: range } }),
      this.sessionUserRepository.count({ where: { completedAt: range } }),
      this.resourceUserRepository.count({ where: { createdAt: range } }),
      this.resourceUserRepository.count({ where: { completedAt: range } }),
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
      this.countWhatsappByDate('su."createdAt"', from, to),
      this.countWhatsappByDate('su."cancelledAt"', from, to),
    ]);

    return {
      newUsers,
      deletedUsers,
      coursesStarted,
      coursesCompleted,
      sessionsStarted,
      sessionsCompleted,
      resourcesStarted,
      resourcesCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapyBookingsScheduledForPeriod,
      partnerAccessGrants,
      partnerAccessActivations,
      whatsappSubscribed,
      whatsappUnsubscribed,
    };
  }

  /** Query-builder join (not a nested-where) because SubscriptionUserEntity
   *  doesn't eager-load the relation. */
  private async countWhatsappByDate(
    column: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.subscriptionUserRepository
      .createQueryBuilder('su')
      .innerJoin('su.subscription', 's')
      .where('s.name = :name', { name: WHATSAPP_SUBSCRIPTION_NAME })
      .andWhere(`${column} BETWEEN :from AND :to`, { from, to })
      .getCount();
  }

  async collectBreakdowns({ from, to }: ReportWindow): Promise<DbBreakdowns> {
    // Three parallel aggregations — each hits its own completedAt index.
    const [sessionRows, courseRows, resourceRows] = await Promise.all([
      this.sessionUserRepository
        .createQueryBuilder('su')
        .innerJoin('su.session', 's')
        .innerJoin('s.course', 'c')
        .select('c.name', 'courseName')
        .addSelect('s.name', 'sessionName')
        .addSelect('COUNT(su."sessionUserId")', 'count')
        .where('su."completedAt" BETWEEN :from AND :to', { from, to })
        .groupBy('c.name')
        .addGroupBy('s.name')
        .orderBy('count', 'DESC')
        .getRawMany<{ courseName: string; sessionName: string; count: string }>(),
      this.courseUserRepository
        .createQueryBuilder('cu')
        .innerJoin('cu.course', 'c')
        .select('c.name', 'courseName')
        .addSelect('COUNT(cu."courseUserId")', 'count')
        .where('cu."completedAt" BETWEEN :from AND :to', { from, to })
        .groupBy('c.name')
        .getRawMany<{ courseName: string; count: string }>(),
      this.resourceUserRepository
        .createQueryBuilder('ru')
        .innerJoin('ru.resource', 'r')
        .select('r.category', 'category')
        .addSelect('r.name', 'resourceName')
        .addSelect('COUNT(ru."resourceUserId")', 'count')
        .where('ru."completedAt" BETWEEN :from AND :to', { from, to })
        .groupBy('r.category')
        .addGroupBy('r.name')
        .orderBy('count', 'DESC')
        .getRawMany<{ category: string; resourceName: string; count: string }>(),
    ]);

    const byCourse = new Map<
      string,
      { courseCompletions: number; sessions: Array<{ name: string; count: number }> }
    >();

    // Rows arrive globally sorted by COUNT DESC, so pushes preserve per-course order.
    for (const row of sessionRows) {
      const entry = byCourse.get(row.courseName) ?? { courseCompletions: 0, sessions: [] };
      entry.sessions.push({ name: row.sessionName, count: Number(row.count) });
      byCourse.set(row.courseName, entry);
    }
    for (const row of courseRows) {
      const entry = byCourse.get(row.courseName) ?? { courseCompletions: 0, sessions: [] };
      entry.courseCompletions = Number(row.count);
      byCourse.set(row.courseName, entry);
    }

    // Return full children lists; the renderer applies cadence-aware caps.
    const completedCourses = [...byCourse.entries()]
      .map(([name, data]) => {
        const sessionCompletions = data.sessions.reduce((s, r) => s + r.count, 0);
        return {
          name,
          sessionCompletions,
          courseCompletions: data.courseCompletions,
          sessions: data.sessions,
        };
      })
      .sort(
        (a, b) =>
          b.sessionCompletions - a.sessionCompletions ||
          b.courseCompletions - a.courseCompletions ||
          a.name.localeCompare(b.name),
      );

    const byCategory = new Map<string, Array<{ name: string; count: number }>>();
    for (const row of resourceRows) {
      const entry = byCategory.get(row.category) ?? [];
      entry.push({ name: row.resourceName, count: Number(row.count) });
      byCategory.set(row.category, entry);
    }

    const completedResources: DbResourceCategoryBreakdownRow[] = [...byCategory.entries()]
      .map(([category, resources]) => ({
        category,
        resourceCompletions: resources.reduce((s, r) => s + r.count, 0),
        resources,
      }))
      .sort(
        (a, b) =>
          b.resourceCompletions - a.resourceCompletions ||
          a.category.localeCompare(b.category),
      );

    return { completedCourses, completedResources };
  }

  /** Not window-bounded. See DbTotals for field definitions. */
  async collectTotals(now: Date): Promise<DbTotals> {
    const [
      liveUsers,
      activeWhatsappSubscribers,
      activatedPartnerAccess,
      totalSessionsCompleted,
      totalCoursesCompleted,
      totalResourcesCompleted,
      totalTherapyBookings,
    ] = await Promise.all([
      this.userRepository.count({ where: { deletedAt: IsNull() } }),
      this.subscriptionUserRepository
        .createQueryBuilder('su')
        .innerJoin('su.subscription', 's')
        .where('s.name = :name', { name: WHATSAPP_SUBSCRIPTION_NAME })
        .andWhere('su."cancelledAt" IS NULL')
        .getCount(),
      this.partnerAccessRepository.count({ where: { activatedAt: Not(IsNull()) } }),
      this.sessionUserRepository.count({ where: { completedAt: Not(IsNull()) } }),
      this.courseUserRepository.count({ where: { completedAt: Not(IsNull()) } }),
      this.resourceUserRepository.count({ where: { completedAt: Not(IsNull()) } }),
      // Past-dated, non-cancelled. Not "delivered" — COMPLETED_BOOKING isn't wired.
      this.therapySessionRepository.count({
        where: {
          startDateTime: LessThanOrEqual(now),
          action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING),
        },
      }),
    ]);

    return {
      liveUsers,
      activeWhatsappSubscribers,
      activatedPartnerAccess,
      totalSessionsCompleted,
      totalCoursesCompleted,
      totalResourcesCompleted,
      totalTherapyBookings,
    };
  }
}
