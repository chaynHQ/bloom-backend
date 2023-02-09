import { IFeature } from 'src/feature/feature.interface';

export interface IPartnerFeature {
  partnerId: string;
  featureId: string;
  active: boolean;
  feature: IFeature;
}
