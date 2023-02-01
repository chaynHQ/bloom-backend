import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from '../entities/base.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { CoursePartnerEntity } from './course-partner.entity';

@Entity({ name: 'partner' })
export class PartnerEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @OneToMany(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partner, {
    onDelete: 'CASCADE',
  })
  partnerAdmin: PartnerAdminEntity[];

  @OneToMany(() => PartnerAccessEntity, (partnerAccessEntity) => partnerAccessEntity.partner, {
    onDelete: 'CASCADE',
  })
  partnerAccess: PartnerAccessEntity[];

  @OneToMany(() => CoursePartnerEntity, (coursePartnerEntity) => coursePartnerEntity.partner)
  partner: PartnerEntity[];
}
