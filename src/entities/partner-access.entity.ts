import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'partner_access' })
export class PartnerAccessEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerAccessId' })
  id: string;

  @Column({ nullable: true })
  userId: string;
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAccess)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAccess)
  @JoinTable({ name: 'partner', joinColumn: { name: 'partnerId' } })
  partner: PartnerEntity;

  @Column()
  partnerAdminId: string;
  @ManyToOne(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partnerAccess, {
    eager: true,
  })
  @JoinTable({ name: 'partner_admin', joinColumn: { name: 'partnerAdminId' } })
  partnerAdmin: PartnerAdminEntity;

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
