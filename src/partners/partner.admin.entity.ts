import { Base } from 'src/Base';
import { PartnerAccessEntity } from 'src/partnersAccess/partner.access.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class PartnerAdminEntity extends Base {
  @Column({ nullable: false })
  name: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity[];
}
