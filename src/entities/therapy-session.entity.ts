import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SIMPLYBOOK_ACTION_ENUM } from '../utils/constants';
import { BaseEntity } from './base.entity';
import { PartnerAccessEntity } from './partner-access.entity';

@Entity({ name: 'therapy_session' })
export class TherapySessionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: SIMPLYBOOK_ACTION_ENUM;

  @Column()
  client_email: string;

  @Column({ nullable: true })
  booking_code: string;

  @Column()
  client_timezone: string;

  @Column()
  service_name: string;

  @Column()
  service_provider_name: string;

  @Column()
  service_provider_email: string;

  @Column({ type: 'timestamptz' })
  start_date_time: Date;

  @Column({ type: 'timestamptz' })
  end_date_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rescheduledFrom: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column()
  partnerAccessId: string;
  @ManyToOne(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.therapySession)
  @JoinTable({ name: 'partner_access', joinColumn: { name: 'partnerAccessId' } })
  partnerAccess: PartnerAccessEntity;
}
