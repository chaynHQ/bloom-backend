import { PartnerAccessEntity } from 'src/models/partner-access.entity';
import { PartnerEntity } from 'src/models/partner.entity';
import { UserEntity } from 'src/models/user.entity';
import { Entity, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class PartnerAdminEntity extends BaseEntity {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAdmin)
  user: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnenEntity) => partnenEntity.partnersAdmin)
  partner: PartnerEntity;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess?: PartnerAccessEntity[];
}
