import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseBloomEntity } from '../entities/base.entity';
import { FeatureEntity } from './feature.entity';
import { PartnerEntity } from './partner.entity';

@Entity({ name: 'partner_feature' })
@Unique('partner_feature_index_name', ['partnerId', 'featureId'])
export class PartnerFeatureEntity extends BaseBloomEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerFeatureId' })
  id: string;
  @Column()
  active: boolean;

  @Column()
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerFeature, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'partner', joinColumn: { name: 'partnerId' } })
  partner: PartnerEntity;

  @Column()
  featureId: string;
  @ManyToOne(() => FeatureEntity, (featureEntity) => featureEntity.partnerFeature, {
    onDelete: 'CASCADE',
  })
  @JoinTable({ name: 'feature', joinColumn: { name: 'featureId' } })
  feature: FeatureEntity;
}
