import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class PartnerAccessEntity extends BaseEntity {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAccess)
  @JoinColumn()
  user: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAccess)
  partner: PartnerEntity;

  @ManyToOne(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.admin)
  createdBy: PartnerAdminEntity;

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
