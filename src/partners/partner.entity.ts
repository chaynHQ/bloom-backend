import { Base } from 'src/Base';
import { PartnerAdminEntity } from 'src/partner-admin/partner-admin.entity';
import { PartnerAccessEntity } from 'src/partners-access/partner-access.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class PartnerEntity extends Base {
  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColour: string;

  @OneToMany(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partner, {
    onDelete: 'CASCADE',
    eager: true,
  })
  partnersAdmin: PartnerAdminEntity[];

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user, {
    eager: true,
  })
  partnerAccess: PartnerAccessEntity[];
}
