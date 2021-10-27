import { Base } from 'src/Base';
import { PartnerAccessEntity } from 'src/partners-access/partner-access.entity';
import { PartnerEntity } from 'src/partners/partner.entity';
import { UserEntity } from 'src/users/user.entity';
import { Entity, ManyToOne, OneToMany, OneToOne } from 'typeorm';

@Entity()
export class PartnerAdminEntity extends Base {
  @OneToOne(() => UserEntity, (userEntity) => userEntity.partnerAdmin)
  user: UserEntity;

  @ManyToOne(() => PartnerEntity, (partnenEntity) => partnenEntity.partnersAdmin)
  partner: PartnerEntity;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess?: PartnerAccessEntity[];
}
