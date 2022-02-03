import { IPartner } from 'src/partner/partner.interface';

export interface IPartnerAccess {
  id?: string;
  activatedAt?: Date | string;
  featureLiveChat?: boolean;
  featureTherapy?: boolean;
  accessCode?: string;
  therapySessionsRemaining?: number;
  therapySessionsRedeemed?: number;
}

export interface IPartnerAccessWithPartner extends IPartnerAccess {
  partner?: IPartner;
}
