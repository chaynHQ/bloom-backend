import { FeatureEntity } from '../../entities/feature.entity';

export class GetPartnerFeatureDto {
  partnerId: string;
  featureId: string;
  feature: FeatureEntity;
  active: boolean;
}

export class GetPartnerDto {
  id: string;
  name: string;
  isActive: boolean;
  partnerFeature: GetPartnerFeatureDto[];
}
