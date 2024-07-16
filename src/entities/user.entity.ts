import { Column, Entity, Generated, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { EMAIL_REMINDERS_FREQUENCY } from '../utils/constants';
import { BaseBloomEntity } from './base.entity';
import { CourseUserEntity } from './course-user.entity';
import { EventLogEntity } from './event-log.entity';
import { SubscriptionUserEntity } from './subscription-user.entity';
import { TherapySessionEntity } from './therapy-session.entity';

@Entity({ name: 'user' })
export class UserEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'userId' })
  id: string;

  @Column({ unique: true })
  firebaseUid: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  signUpLanguage: string;

  @Column({ default: false })
  contactPermission: boolean; // marketing consent - mapped to mailchimp marketing_permissions field

  @Column({ default: true })
  serviceEmailsPermission: boolean; // service emails consent - mapped to mailchimp status field

  @Column({ default: EMAIL_REMINDERS_FREQUENCY.NEVER })
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY;

  @Column({ type: Boolean, default: false })
  isSuperAdmin: boolean;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastActiveAt: Date; // set each time user record is fetched

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user, { cascade: true })
  partnerAccess: PartnerAccessEntity[];

  @OneToOne(() => PartnerAdminEntity, (partnerAdmin) => partnerAdmin.user, { cascade: true })
  partnerAdmin: PartnerAdminEntity;

  @OneToMany(() => CourseUserEntity, (courseUser) => courseUser.user, { cascade: true })
  courseUser: CourseUserEntity[];

  @OneToMany(() => SubscriptionUserEntity, (subscriptionUser) => subscriptionUser.user, {
    cascade: true,
  })
  subscriptionUser: SubscriptionUserEntity[];

  @OneToMany(() => TherapySessionEntity, (therapySession) => therapySession.user, { cascade: true })
  therapySession: TherapySessionEntity[];

  @OneToMany(() => EventLogEntity, (eventLog) => eventLog.user, { cascade: true })
  eventLog: EventLogEntity[];

  @Column({ unique: true })
  @Generated('uuid')
  crispTokenId: string;
}
