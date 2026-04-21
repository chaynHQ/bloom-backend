import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import {
  DbBreakdowns,
  DbMetrics,
  DbNamedCount,
  DbResourceCategoryBreakdownRow,
  DbTotals,
  ReportWindow,
} from './reporting.types';

/** Must match the seeded subscription.name (see
 *  SubscriptionUserService.createWhatsappSubscription). */
const WHATSAPP_SUBSCRIPTION_NAME = 'whatsapp';

/** Bucket label for users with no PartnerAccess row. */
const PUBLIC_PARTNER_LABEL = 'Public (no partner)';

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
    @InjectRepository(SessionFeedbackEntity)
    private readonly sessionFeedbackRepository: Repository<SessionFeedbackEntity>,
    @InjectRepository(ResourceFeedbackEntity)
    private readonly resourceFeedbackRepository: Repository<ResourceFeedbackEntity>,
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
      sessionFeedbackSubmitted,
      resourceFeedbackSubmitted,
      activationRates,
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
      this.therapySessionRepository.count({ where: { createdAt: range } }),
      this.therapySessionRepository.count({ where: { cancelledAt: range } }),
      this.therapySessionRepository.count({
        where: { startDateTime: range, action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) },
      }),
      this.partnerAccessRepository.count({ where: { createdAt: range } }),
      this.partnerAccessRepository.count({ where: { activatedAt: range } }),
      this.countWhatsappByDate('su."createdAt"', from, to),
      this.countWhatsappByDate('su."cancelledAt"', from, to),
      this.sessionFeedbackRepository.count({ where: { createdAt: range } }),
      this.resourceFeedbackRepository.count({ where: { createdAt: range } }),
      this.computeActivationRates(from, to),
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
      sessionFeedbackSubmitted,
      resourceFeedbackSubmitted,
      activationRate: activationRates.activationRate,
      partnerActivationRate: activationRates.partnerActivationRate,
    };
  }

  /** One pass over new-user cohort → both activation rates.
   *  - activationRate        = % of new users who completed ≥1 session
   *                            in the same window.
   *  - partnerActivationRate = % of new users with any activated partner_access
   *                            by query time.
   *  Zero cohort → both rates return 0 (treated as "no sample" via the
   *  flatline-zero hide rule in the renderer). */
  private async computeActivationRates(
    from: Date,
    to: Date,
  ): Promise<{ activationRate: number; partnerActivationRate: number }> {
    const row = await this.userRepository
      .createQueryBuilder('u')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM session_user su
          INNER JOIN course_user cu ON cu."courseUserId" = su."courseUserId"
          WHERE cu."userId" = u.id
            AND su."completedAt" BETWEEN :from AND :to
        ))`,
        'activated',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM partner_access pa
          WHERE pa."userId" = u.id AND pa."activatedAt" IS NOT NULL
        ))`,
        'partnerActivated',
      )
      .where('u."createdAt" BETWEEN :from AND :to')
      .andWhere('u."deletedAt" IS NULL')
      .setParameters({ from, to })
      .getRawOne<{ total: string; activated: string; partnerActivated: string }>();

    const total = Number(row?.total ?? 0);
    if (total === 0) return { activationRate: 0, partnerActivationRate: 0 };
    const activated = Number(row?.activated ?? 0);
    const partnerActivated = Number(row?.partnerActivated ?? 0);
    return {
      activationRate: Math.round((activated / total) * 100),
      partnerActivationRate: Math.round((partnerActivated / total) * 100),
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
    const [
      sessionRows,
      courseRows,
      resourceRows,
      newUsersByPartner,
      partnerGrantsByPartner,
      partnerActivationsByPartner,
      newUsersByLanguage,
      sessionFeedbackByTag,
      resourceFeedbackByTag,
      therapyByTherapist,
      therapyByPartner,
    ] = await Promise.all([
      // Started + completed are emitted from one scan per entity (Postgres
      // FILTER aggregate) — a row qualifies if it started OR completed in
      // the window. Avoids running two near-identical GROUP BY queries.
      this.sessionUserRepository
        .createQueryBuilder('su')
        .innerJoin('su.session', 's')
        .innerJoin('s.course', 'c')
        .select('c.name', 'courseName')
        .addSelect('s.name', 'sessionName')
        .addSelect(
          'COUNT(*) FILTER (WHERE su."createdAt" BETWEEN :from AND :to)',
          'started',
        )
        .addSelect(
          'COUNT(*) FILTER (WHERE su."completedAt" BETWEEN :from AND :to)',
          'completed',
        )
        .where('su."createdAt" BETWEEN :from AND :to')
        .orWhere('su."completedAt" BETWEEN :from AND :to')
        .setParameters({ from, to })
        .groupBy('c.name')
        .addGroupBy('s.name')
        .getRawMany<{
          courseName: string;
          sessionName: string;
          started: string;
          completed: string;
        }>(),
      this.courseUserRepository
        .createQueryBuilder('cu')
        .innerJoin('cu.course', 'c')
        .select('c.name', 'courseName')
        .addSelect(
          'COUNT(*) FILTER (WHERE cu."createdAt" BETWEEN :from AND :to)',
          'started',
        )
        .addSelect(
          'COUNT(*) FILTER (WHERE cu."completedAt" BETWEEN :from AND :to)',
          'completed',
        )
        .where('cu."createdAt" BETWEEN :from AND :to')
        .orWhere('cu."completedAt" BETWEEN :from AND :to')
        .setParameters({ from, to })
        .groupBy('c.name')
        .getRawMany<{ courseName: string; started: string; completed: string }>(),
      this.resourceUserRepository
        .createQueryBuilder('ru')
        .innerJoin('ru.resource', 'r')
        .select('r.category', 'category')
        .addSelect('r.name', 'resourceName')
        .addSelect(
          'COUNT(*) FILTER (WHERE ru."createdAt" BETWEEN :from AND :to)',
          'started',
        )
        .addSelect(
          'COUNT(*) FILTER (WHERE ru."completedAt" BETWEEN :from AND :to)',
          'completed',
        )
        .where('ru."createdAt" BETWEEN :from AND :to')
        .orWhere('ru."completedAt" BETWEEN :from AND :to')
        .setParameters({ from, to })
        .groupBy('r.category')
        .addGroupBy('r.name')
        .getRawMany<{
          category: string;
          resourceName: string;
          started: string;
          completed: string;
        }>(),
      this.queryNewUsersByPartner(from, to),
      this.queryPartnerAccessByPartner('createdAt', from, to),
      this.queryPartnerAccessByPartner('activatedAt', from, to),
      this.queryNewUsersByLanguage(from, to),
      this.queryFeedbackByTag(this.sessionFeedbackRepository, 'sf', from, to),
      this.queryFeedbackByTag(this.resourceFeedbackRepository, 'rf', from, to),
      this.queryTherapyByTherapist(from, to),
      this.queryTherapyByPartner(from, to),
    ]);

    const courses = this.assembleCourseBreakdowns(sessionRows, courseRows);
    const resources = this.assembleResourceBreakdowns(resourceRows);

    return {
      courses,
      resources,
      newUsersByPartner,
      partnerAccessGrantsByPartner: partnerGrantsByPartner,
      partnerAccessActivationsByPartner: partnerActivationsByPartner,
      newUsersByLanguage,
      sessionFeedbackByTag,
      resourceFeedbackByTag,
      therapyByTherapist,
      therapyByPartner,
    };
  }

  private assembleCourseBreakdowns(
    sessionRows: Array<{
      courseName: string;
      sessionName: string;
      started: string;
      completed: string;
    }>,
    courseRows: Array<{ courseName: string; started: string; completed: string }>,
  ): DbBreakdowns['courses'] {
    const byCourse = new Map<
      string,
      {
        coursesStarted: number;
        coursesCompleted: number;
        sessions: Array<{ name: string; started: number; completed: number }>;
      }
    >();
    for (const row of sessionRows) {
      const entry =
        byCourse.get(row.courseName) ??
        { coursesStarted: 0, coursesCompleted: 0, sessions: [] };
      entry.sessions.push({
        name: row.sessionName,
        started: Number(row.started),
        completed: Number(row.completed),
      });
      byCourse.set(row.courseName, entry);
    }
    for (const row of courseRows) {
      const entry =
        byCourse.get(row.courseName) ??
        { coursesStarted: 0, coursesCompleted: 0, sessions: [] };
      entry.coursesStarted = Number(row.started);
      entry.coursesCompleted = Number(row.completed);
      byCourse.set(row.courseName, entry);
    }
    return [...byCourse.entries()]
      .map(([name, data]) => {
        const sessionsStarted = data.sessions.reduce((s, r) => s + r.started, 0);
        const sessionsCompleted = data.sessions.reduce((s, r) => s + r.completed, 0);
        const sessions = [...data.sessions].sort(
          (a, b) =>
            b.completed - a.completed ||
            b.started - a.started ||
            a.name.localeCompare(b.name),
        );
        return {
          name,
          coursesStarted: data.coursesStarted,
          coursesCompleted: data.coursesCompleted,
          sessionsStarted,
          sessionsCompleted,
          sessions,
        };
      })
      .sort(
        (a, b) =>
          b.sessionsCompleted - a.sessionsCompleted ||
          b.sessionsStarted - a.sessionsStarted ||
          b.coursesCompleted - a.coursesCompleted ||
          b.coursesStarted - a.coursesStarted ||
          a.name.localeCompare(b.name),
      );
  }

  private assembleResourceBreakdowns(
    resourceRows: Array<{
      category: string;
      resourceName: string;
      started: string;
      completed: string;
    }>,
  ): DbResourceCategoryBreakdownRow[] {
    const byCategory = new Map<
      string,
      Array<{ name: string; started: number; completed: number }>
    >();
    for (const row of resourceRows) {
      const entry = byCategory.get(row.category) ?? [];
      entry.push({
        name: row.resourceName,
        started: Number(row.started),
        completed: Number(row.completed),
      });
      byCategory.set(row.category, entry);
    }
    return [...byCategory.entries()]
      .map(([category, resources]) => {
        const sorted = [...resources].sort(
          (a, b) =>
            b.completed - a.completed ||
            b.started - a.started ||
            a.name.localeCompare(b.name),
        );
        return {
          category,
          resourcesStarted: sorted.reduce((s, r) => s + r.started, 0),
          resourcesCompleted: sorted.reduce((s, r) => s + r.completed, 0),
          resources: sorted,
        };
      })
      .sort(
        (a, b) =>
          b.resourcesCompleted - a.resourcesCompleted ||
          b.resourcesStarted - a.resourcesStarted ||
          a.category.localeCompare(b.category),
      );
  }

  /** Users with N partner-access rows are counted N times (once per
   *  partner) — measures partner-attributable acquisition, not head-count. */
  private async queryNewUsersByPartner(from: Date, to: Date): Promise<DbNamedCount[]> {
    const rows = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.partnerAccess', 'pa')
      .leftJoin('pa.partner', 'p')
      .select('COALESCE(p.name, :publicLabel)', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('u."createdAt" BETWEEN :from AND :to', { from, to })
      .andWhere('u."deletedAt" IS NULL')
      .groupBy('p.name')
      .orderBy('count', 'DESC')
      .setParameter('publicLabel', PUBLIC_PARTNER_LABEL)
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }

  /** `column` is type-restricted to an allow-list — not user input. */
  private async queryPartnerAccessByPartner(
    column: 'createdAt' | 'activatedAt',
    from: Date,
    to: Date,
  ): Promise<DbNamedCount[]> {
    const rows = await this.partnerAccessRepository
      .createQueryBuilder('pa')
      .innerJoin('pa.partner', 'p')
      .select('p.name', 'name')
      .addSelect('COUNT(pa."partnerAccessId")', 'count')
      .where(`pa."${column}" BETWEEN :from AND :to`, { from, to })
      .groupBy('p.name')
      .orderBy('count', 'DESC')
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }

  private async queryNewUsersByLanguage(from: Date, to: Date): Promise<DbNamedCount[]> {
    const rows = await this.userRepository
      .createQueryBuilder('u')
      .select(`COALESCE(NULLIF(u."signUpLanguage", ''), 'unknown')`, 'name')
      .addSelect('COUNT(*)', 'count')
      .where('u."createdAt" BETWEEN :from AND :to', { from, to })
      .andWhere('u."deletedAt" IS NULL')
      .groupBy('u."signUpLanguage"')
      .orderBy('count', 'DESC')
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }

  private async queryFeedbackByTag<T>(
    repo: Repository<T>,
    alias: string,
    from: Date,
    to: Date,
  ): Promise<DbNamedCount[]> {
    const rows = await repo
      .createQueryBuilder(alias)
      .select(`${alias}."feedbackTags"`, 'name')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}."createdAt" BETWEEN :from AND :to`, { from, to })
      .groupBy(`${alias}."feedbackTags"`)
      .orderBy('count', 'DESC')
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }

  private async queryTherapyByTherapist(from: Date, to: Date): Promise<DbNamedCount[]> {
    const rows = await this.therapySessionRepository
      .createQueryBuilder('ts')
      .select('ts."serviceProviderName"', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('ts."startDateTime" BETWEEN :from AND :to', { from, to })
      .andWhere('ts."action" != :cancelled', {
        cancelled: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      })
      .groupBy('ts."serviceProviderName"')
      .orderBy('count', 'DESC')
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name || '(unknown)', count: Number(r.count) }));
  }

  private async queryTherapyByPartner(from: Date, to: Date): Promise<DbNamedCount[]> {
    const rows = await this.therapySessionRepository
      .createQueryBuilder('ts')
      .innerJoin('ts.partnerAccess', 'pa')
      .innerJoin('pa.partner', 'p')
      .select('p.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('ts."startDateTime" BETWEEN :from AND :to', { from, to })
      .andWhere('ts."action" != :cancelled', {
        cancelled: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      })
      .groupBy('p.name')
      .orderBy('count', 'DESC')
      .getRawMany<{ name: string; count: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
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
