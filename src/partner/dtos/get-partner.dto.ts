import { FeatureEntity } from '../../entities/feature.entity';

export class GetPartnerFeatureResponseDto {
  partnerId: string;
  featureId: string;
  feature: FeatureEntity;
  active: boolean;
}

export class GetPartnerDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  therapySessionsPerCode: number;
  partnerFeature: GetPartnerFeatureResponseDto[];
}

export class ActivePartnerDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export class GetPartnerAdminViewDto {
  id: string;
  name: string;
  slug: string;
  storyblokUuid: string | null;
  isActive: boolean;
  therapySessionsPerCode: number;
  automaticAccessCode: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
