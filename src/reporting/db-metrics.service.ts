import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { Logger } from 'src/logger/logger';
import { SIMPLYBOOK_ACTION_ENUM } from 'src/utils/constants';
import { Between, IsNull, Not, Repository } from 'typeorm';
import {
  DbBreakdowns,
  DbMetrics,
  DbNamedCount,
  DbResourceCategoryBreakdownRow,
  ReportWindow,
} from './reporting.types';

/** Must match the seeded subscription.name (see
 *  SubscriptionUserService.createWhatsappSubscription). */
const WHATSAPP_SUBSCRIPTION_NAME = 'whatsapp';

/** Bucket label for users with no PartnerAccess row. */
const PUBLIC_PARTNER_LABEL = 'Public (no partner)';

@Injectable()
export class DbMetricsService {
  private readonly logger = new Logger('DbMetricsService');

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
    @InjectRepository(EventLogEntity)
    private readonly eventLogRepository: Repository<EventLogEntity>,
  ) {}

  /** Each metric runs in its own try/catch — a single failing query yields
   *  `null` for that key only and is logged, while every other metric still
   *  reports a real value. Distinct from `0`, which is a genuine observation. */
  async collect({ from, to }: ReportWindow): Promise<DbMetrics> {
    const range = Between(from, to);
    const tally = (label: keyof DbMetrics, run: () => Promise<number>) =>
      this.tryMetric(label, run);

    const [
      newUsers,
      newPartnerUsers,
      deletedUsers,
      activeUsers,
      coursesStarted,
      coursesCompleted,
      sessionsStarted,
      sessionsCompleted,
      resourcesStarted,
      resourcesCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapySessionsCompleted,
      partnerAccessGrants,
      partnerAccessActivations,
      whatsappSubscribed,
      whatsappUnsubscribed,
      sessionFeedbackSubmitted,
      resourceFeedbackSubmitted,
      messagesSent,
      messagesReceived,
    ] = await Promise.all([
      tally('newUsers', () =>
        this.userRepository.count({ where: { createdAt: range, deletedAt: IsNull() } }),
      ),
      // New users created in window with ≥1 partner_access row attached.
      // Whether they redeemed a code themselves or were granted access
      // doesn't matter — the partner signup is the signal.
      tally('newPartnerUsers', () =>
        this.userRepository
          .createQueryBuilder('u')
          .innerJoin('u.partnerAccess', 'pa')
          .where('u."createdAt" BETWEEN :from AND :to', { from, to })
          .andWhere('u."deletedAt" IS NULL')
          .getCount(),
      ),
      tally('deletedUsers', () => this.userRepository.count({ where: { deletedAt: range } })),
      // `lastActiveAt` is set on each user-record fetch by the backend — counts
      // users who interacted with the API in the window. Narrower than GA
      // active users (which counts any page view).
      tally('activeUsers', () =>
        this.userRepository.count({
          where: { lastActiveAt: range, deletedAt: IsNull() },
        }),
      ),
      tally('coursesStarted', () => this.courseUserRepository.count({ where: { createdAt: range } })),
      tally('coursesCompleted', () =>
        this.courseUserRepository.count({ where: { completedAt: range } }),
      ),
      tally('sessionsStarted', () =>
        this.sessionUserRepository.count({ where: { createdAt: range } }),
      ),
      tally('sessionsCompleted', () =>
        this.sessionUserRepository.count({ where: { completedAt: range } }),
      ),
      tally('resourcesStarted', () =>
        this.resourceUserRepository.count({ where: { createdAt: range } }),
      ),
      tally('resourcesCompleted', () =>
        this.resourceUserRepository.count({ where: { completedAt: range } }),
      ),
      tally('therapyBookingsBooked', () =>
        this.therapySessionRepository.count({ where: { createdAt: range } }),
      ),
      tally('therapyBookingsCancelled', () =>
        this.therapySessionRepository.count({ where: { cancelledAt: range } }),
      ),
      // Proxy for sessions delivered: scheduled to start in the window AND
      // not cancelled. (SimplyBook's COMPLETED_BOOKING webhook isn't wired,
      // so we can't directly observe attendance.)
      tally('therapySessionsCompleted', () =>
        this.therapySessionRepository.count({
          where: { startDateTime: range, action: Not(SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING) },
        }),
      ),
      tally('partnerAccessGrants', () =>
        this.partnerAccessRepository.count({ where: { createdAt: range } }),
      ),
      tally('partnerAccessActivations', () =>
        this.partnerAccessRepository.count({ where: { activatedAt: range } }),
      ),
      tally('whatsappSubscribed', () =>
        this.countWhatsappByDate('su."createdAt"', from, to),
      ),
      tally('whatsappUnsubscribed', () =>
        this.countWhatsappByDate('su."cancelledAt"', from, to),
      ),
      tally('sessionFeedbackSubmitted', () =>
        this.sessionFeedbackRepository.count({ where: { createdAt: range } }),
      ),
      tally('resourceFeedbackSubmitted', () =>
        this.resourceFeedbackRepository.count({ where: { createdAt: range } }),
      ),
      // Authoritative chat message counts from event_log — distinct from the
      // GA4 CHAT_MESSAGE_SENT event which is lossy under ad-blockers / consent.
      // `date` is the emit time from Front (webhook `emitted_at`), so it's the
      // accurate timestamp for windowing — `createdAt` is when we wrote the row
      // (which diverges for backfilled/migrated or delayed-webhook messages).
      tally('messagesSent', () =>
        this.eventLogRepository.count({
          where: { event: EVENT_NAME.CHAT_MESSAGE_SENT, date: range },
        }),
      ),
      tally('messagesReceived', () =>
        this.eventLogRepository.count({
          where: { event: EVENT_NAME.CHAT_MESSAGE_RECEIVED, date: range },
        }),
      ),
    ]);

    return {
      newUsers,
      newPartnerUsers,
      deletedUsers,
      activeUsers,
      coursesStarted,
      coursesCompleted,
      sessionsStarted,
      sessionsCompleted,
      resourcesStarted,
      resourcesCompleted,
      therapyBookingsBooked,
      therapyBookingsCancelled,
      therapySessionsCompleted,
      partnerAccessGrants,
      partnerAccessActivations,
      whatsappSubscribed,
      whatsappUnsubscribed,
      sessionFeedbackSubmitted,
      resourceFeedbackSubmitted,
      messagesSent,
      messagesReceived,
    };
  }

  private async tryMetric(
    label: keyof DbMetrics,
    run: () => Promise<number>,
  ): Promise<number | null> {
    try {
      return await run();
    } catch (err) {
      this.logger.error(
        `DbMetrics: ${label} failed: ${err?.message || 'unknown error'}`,
      );
      return null;
    }
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

}
