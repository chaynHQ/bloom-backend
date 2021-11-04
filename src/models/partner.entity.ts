import { BaseEntity } from 'src/models/base.entity';
import { PartnerAdminEntity } from 'src/models/partner-admin.entity';
import { PartnerAccessEntity } from 'src/models/partner-access.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class PartnerEntity extends BaseEntity {
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

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.user)
  partnerAccess: PartnerAccessEntity[];
}
