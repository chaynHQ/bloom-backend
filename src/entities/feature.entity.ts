import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseBloomEntity } from '../entities/base.entity';
import { PartnerFeatureEntity } from './partner-feature.entity';

@Entity({ name: 'feature' })
export class FeatureEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'featureId' })
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => PartnerFeatureEntity, (partnerFeature) => partnerFeature.feature)
  partnerFeature: PartnerFeatureEntity[];
}
