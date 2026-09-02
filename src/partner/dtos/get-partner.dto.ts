import { IPartnerFeature } from 'src/partner-feature/partner-feature.interface';

export class GetPartnerDto {
  name: string;
  id: string;
  isActive: boolean;
  partnerFeature: IPartnerFeature[];
}
