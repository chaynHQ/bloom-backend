import { Base } from 'src/Base';
import { PartnerAccessEntity } from 'src/partners-access/partner-access.entity';
import { PartnerEntity } from 'src/partners/partner.entity';
import { UserEntity } from 'src/users/user.entity';
import { Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class PartnerAdminEntity extends Base {
  @OneToMany(() => UserEntity, (userEntity) => userEntity.partnerAdmin)
  user: UserEntity[];

  @ManyToOne(() => PartnerEntity, (partnenEntity) => partnenEntity.partnerAdmin)
  partner: PartnerEntity;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity[];
}
