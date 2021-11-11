import { BaseEntity } from 'src/entities/base.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'partner' })
export class PartnerEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerId' })
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColour: string;

  @OneToMany(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partner, {
    onDelete: 'CASCADE',
  })
  partnerAdmin: PartnerAdminEntity[];

  @OneToMany(() => PartnerAccessEntity, (partnerAccessEntity) => partnerAccessEntity.partner, {
    onDelete: 'CASCADE',
  })
  partnerAccess: PartnerAccessEntity[];
}
