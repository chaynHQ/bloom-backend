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
  clientEmail: string;

  @Column({ nullable: true })
  bookingCode: string;

  @Column()
  clientTimezone: string;

  @Column()
  serviceName: string;

  @Column()
  serviceProviderName: string;

  @Column()
  serviceProviderEmail: string;

  @Column({ type: 'timestamptz' })
  startDateTime: Date;

  @Column({ type: 'timestamptz' })
  endDateTime: Date;

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
