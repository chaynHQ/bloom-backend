import { IPartnerFeature } from 'src/partner-feature/partner-feature.interface';

export interface IPartner {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  isActive?: boolean;
  partnerFeature?: IPartnerFeature[];
}
