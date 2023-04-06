import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { PartnerEntity } from '../entities/partner.entity';
import { UserEntity } from '../entities/user.entity';
import { BaseBloomEntity } from './base.entity';
import { TherapySessionEntity } from './therapy-session.entity';

@Entity({ name: 'partner_access' })
export class PartnerAccessEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerAccessId' })
  id: string;

  @Column({ nullable: true, unique: false })
  userId: string;
  @ManyToOne(() => UserEntity, (userEntity) => userEntity.partnerAccess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAccess)
  @JoinTable({ name: 'partner', joinColumn: { name: 'partnerId' } })
  partner: PartnerEntity;

  @Column({ nullable: true })
  partnerAdminId: string;
  @ManyToOne(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partnerAccess, {
    eager: true,
  })
  @JoinTable({ name: 'partner_admin', joinColumn: { name: 'partnerAdminId' } })
  partnerAdmin: PartnerAdminEntity;

  @OneToMany(() => TherapySessionEntity, (therapySession) => therapySession.partnerAccess)
  therapySession: TherapySessionEntity[];

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  activatedAt: Date;

  @Column()
  featureLiveChat: boolean;

  @Column()
  featureTherapy: boolean;

  @Column({ unique: true, length: 6 })
  accessCode: string;

  @Column()
  therapySessionsRemaining: number;

  @Column()
  therapySessionsRedeemed: number;
}
