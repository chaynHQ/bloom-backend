import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseBloomEntity } from './base.entity';

@Entity({ name: 'reporting_run' })
@Unique('UQ_reporting_run_slot', ['periodType', 'periodStart'])
@Index('IDX_reporting_run_type_start', ['periodType', 'periodStart'])
export class ReportingRunEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';

  @Column({ type: 'timestamptz' })
  periodStart: Date;

  @Column({ type: 'timestamptz' })
  periodEnd: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'failed';

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  slackResponse: unknown;

  // Typed columns for the core DB metrics — cheap ints, stable schema, fast
  // trend queries (e.g. `SELECT periodStart, newUsers FROM reporting_run ...`).
  @Column({ type: 'integer', nullable: true })
  newUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  deletedUsers: number | null;

  @Column({ type: 'integer', nullable: true })
  coursesStarted: number | null;

  @Column({ type: 'integer', nullable: true })
  coursesCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  sessionsStarted: number | null;

  @Column({ type: 'integer', nullable: true })
  sessionsCompleted: number | null;

  @Column({ type: 'integer', nullable: true })
  therapyBookingsBooked: number | null;

  @Column({ type: 'integer', nullable: true })
  therapyBookingsCancelled: number | null;

  @Column({ type: 'integer', nullable: true })
  therapyBookingsScheduledForPeriod: number | null;

  @Column({ type: 'integer', nullable: true })
  partnerAccessGrants: number | null;

  @Column({ type: 'integer', nullable: true })
  partnerAccessActivations: number | null;

  @Column({ type: 'jsonb', nullable: true })
  ga4Overview: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4Events: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4Breakdowns: unknown;

  @Column({ type: 'jsonb', nullable: true })
  ga4EventBreakdowns: unknown;
}
