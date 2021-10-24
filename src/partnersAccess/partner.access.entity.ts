import { Base } from 'src/Base';
import { PartnerAdminEntity } from 'src/partners/partner.admin.entity';
import { PartnerEntity } from 'src/partners/partner.entity';
import { UserEntity } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';

@Entity()
export class PartnerAccessEntity extends Base {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAccess, {
    eager: true,
  })
  user?: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerAccess, {
    onDelete: 'CASCADE',
    eager: true,
  })
  partner: PartnerEntity;

  @ManyToOne(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partnerAccess)
  createdBy: PartnerAdminEntity;

  @Column({ nullable: true })
  activatedAt: string;

  @Column()
  featureLiveChat: boolean;

  @Column()
  featureTherapy: boolean;

  @Column()
  therapySessionsRemaining: number;

  @Column()
  therapySessionsRedeemed: number;
}
