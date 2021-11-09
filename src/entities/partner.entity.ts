import { BaseEntity } from 'src/entities/base.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
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
  })
  partnerAdmins: PartnerAdminEntity[];

  @OneToMany(() => PartnerAccessEntity, (partnerAccess) => partnerAccess.partner)
  partnerAccess: PartnerAccessEntity[];
}
