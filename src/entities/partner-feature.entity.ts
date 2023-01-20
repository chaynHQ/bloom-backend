import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';
import { FeatureEntity } from './feature.entity';
import { PartnerEntity } from './partner.entity';

@Entity({ name: 'partner_feature' })
export class PartnerFeatureEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'partnerFeatureId' })
  id: string;
  @Column()
  active: boolean;

  @Column()
  partnerId: string;
  @ManyToOne(() => PartnerEntity, (partnerEntity) => partnerEntity.partnerFeature)
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
