import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from '../entities/base.entity';
import { PartnerAccessEntity } from '../entities/partner-access.entity';
import { PartnerAdminEntity } from '../entities/partner-admin.entity';
import { CoursePartnerEntity } from './course-partner.entity';
import { PartnerFeatureEntity } from './partner-feature.entity';

@Entity({ name: 'partner' })
export class PartnerEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: Boolean, default: true })
  isActive: boolean;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  storyblokUuid: string | null;

  @Column({ type: 'int', default: 0 })
  therapySessionsPerCode: number;

  // The partner whose brand this one is part of, such as Bumble for Bumble For Friends. Synced from
  // the partner story's `parent`, so reports can roll a brand's partners up together.
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => PartnerEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: PartnerEntity | null;

  @OneToMany(() => PartnerAdminEntity, (partnerAdminEntity) => partnerAdminEntity.partner, {
    cascade: true,
  })
  partnerAdmin: PartnerAdminEntity[];

  @OneToMany(() => PartnerAccessEntity, (partnerAccessEntity) => partnerAccessEntity.partner, {
    cascade: true,
  })
  partnerAccess: PartnerAccessEntity[];

  @OneToMany(() => CoursePartnerEntity, (coursePartnerEntity) => coursePartnerEntity.partner, {
    cascade: true,
  })
  partner: PartnerEntity[];

  @OneToMany(() => PartnerFeatureEntity, (partnerFeatureEntity) => partnerFeatureEntity.partner, {
    cascade: true,
  })
  partnerFeature: PartnerFeatureEntity[];
}
