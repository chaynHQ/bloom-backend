import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @Column({ nullable: true })
  logo: string | null;

  @Column({ nullable: true })
  logoAlt: string | null;

  @Column({ nullable: true })
  partnershipLogo: string | null;

  @Column({ nullable: true })
  partnershipLogoAlt: string | null;

  @Column({ nullable: true })
  bloomGirlIllustration: string | null;

  @Column({ nullable: true })
  bloomGirlIllustrationAlt: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ nullable: true })
  footerLine1: string | null;

  @Column({ nullable: true })
  footerLine2: string | null;

  @Column({ nullable: true })
  facebookUrl: string | null;

  @Column({ nullable: true })
  twitterUrl: string | null;

  @Column({ nullable: true })
  instagramUrl: string | null;

  @Column({ nullable: true })
  youtubeUrl: string | null;

  @Column({ nullable: true })
  tiktokUrl: string | null;

  @Column({ nullable: true })
  githubUrl: string | null;

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
