import { PartnerAdminEntity } from 'src/models/partner-admin.entity';
import { PartnerEntity } from 'src/models/partner.entity';
import { UserEntity } from 'src/models/user.entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class PartnerAccessEntity extends BaseEntity {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAccess)
  user?: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAccess, {
    eager: true,
  })
  partner: PartnerEntity;

  @ManyToOne(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partnerAccess)
  createdBy: PartnerAdminEntity;

  @Column({ nullable: true })
  activatedAt: Date;

  @Column()
  featureLiveChat: boolean;

  @Column()
  featureTherapy: boolean;

  @Column()
  therapySessionsRemaining: number;

  @Column()
  therapySessionsRedeemed: number;
}
