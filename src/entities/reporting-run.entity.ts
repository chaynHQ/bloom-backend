import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseBloomEntity } from './base.entity';

@Entity({ name: 'reporting_run' })
@Unique('UQ_reporting_run_slot', ['periodType', 'periodStart'])
@Index('IDX_reporting_run_type_start', ['periodType', 'periodStart'])
export class ReportingRunEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

  @Column({ type: 'timestamptz' })
  periodStart: Date;

  @Column({ type: 'timestamptz' })
  periodEnd: Date;

  /** IANA timezone the report window was computed in. Persisted so the
   *  message can be re-rendered if the global default ever changes. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  periodTimezone: string | null;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'failed';

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  slackResponse: unknown;

  /** Slack `ts` of the parent message — used to thread per-topic replies
   *  under the digest, and as an audit pointer back to the actual posted
   *  message. Null when posting failed before a `ts` was returned. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  slackTs: string | null;

  // Typed columns for DB metrics — cheap ints, stable schema, fast trend
  // queries (e.g. `SELECT periodStart, newUsers FROM reporting_run`) and
  // direct baseline lookups without JSONB path expressions.
  @Column({ type: 'integer', nullable: true })
  newUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  newPartnerUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  deletedUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  activeUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  coursesStarted: number | null;

  @Column({ type: 'integer', nullable: true })
  coursesCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  sessionsStarted: number | null;

  @Column({ type: 'integer', nullable: true })
  sessionsCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  resourcesStarted: number | null;

  @Column({ type: 'integer', nullable: true })
  resourcesCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  therapyBookingsBooked: number | null;

  @Column({ type: 'integer', nullable: true })
  therapyBookingsCancelled: number | null;

  @Column({ type: 'integer', nullable: true })
  therapySessionsCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  partnerAccessGrants: number | null;

  @Column({ type: 'integer', nullable: true })
  partnerAccessActivations: number | null;

  @Column({ type: 'integer', nullable: true })
  whatsappSubscribed: number | null;

  @Column({ type: 'integer', nullable: true })
  whatsappUnsubscribed: number | null;

  @Column({ type: 'integer', nullable: true })
  sessionFeedbackSubmitted: number | null;

  @Column({ type: 'integer', nullable: true })
  resourceFeedbackSubmitted: number | null;

  @Column({ type: 'integer', nullable: true })
  messagesSent: number | null;

  @Column({ type: 'integer', nullable: true })
  messagesReceived: number | null;

  // JSONB snapshots — sufficient (with the typed cols) to re-render the
  // Slack message without re-querying source data.

  /** DB-sourced topic breakdowns (courses/resources/partner/lang/feedback/therapist). */
  @Column({ type: 'jsonb', nullable: true })
  dbBreakdowns: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4Overview: unknown;

  /** Literal copy of GA4 event totals. Weekly+ stores the full unfiltered
   *  list (including dynamic-name + Google auto-events) for retrospective
   *  analysis; daily stores only the events the renderer references. */
  @Column({ type: 'jsonb', nullable: true })
  ga4Events: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4Breakdowns: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4EventBreakdowns: unknown;

  /** Anomalies surfaced in the "Worth looking at" block. Derivable from
   *  prior rows but retained as a change log — what we actually flagged
   *  that week, frozen at render time. */
  @Column({ type: 'jsonb', nullable: true })
  anomalies: unknown;
}
