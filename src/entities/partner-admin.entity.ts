import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PartnerAccessEntity } from './partner-access.entity';

@Entity()
export class PartnerAdminEntity extends BaseEntity {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAdmin, { eager: true })
  @JoinColumn()
  user: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnerAdmin) => partnerAdmin.partnerAdmins)
  partner: PartnerEntity;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.createdBy)
  admin: PartnerAccessEntity[];
}
