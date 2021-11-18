export interface IPartnerAccess {
  id?: string;
  activatedAt?: Date | string;
  featureLiveChat?: boolean;
  featureTherapy?: boolean;
  accessCode?: string;
  therapySessionsRemaining?: number;
  therapySessionsRedeemed?: number;
}
