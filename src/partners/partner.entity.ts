import { Base } from 'src/Base';
import { PartnerAccessEntity } from 'src/partnersAccess/partner.access.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class PartnerEntity extends Base {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColour: string;

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user, {
    onDelete: 'CASCADE',
    eager: true,
  })
  partnerAccess: PartnerAccessEntity[];
}
