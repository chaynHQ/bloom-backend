import { IPartner } from 'src/partner/partner.model';
import { IUser } from 'src/user/user.model';

export interface IPartnerAccess {
  id: string;
  createdBy: CreatedBy;
  partner: IPartner;
  user?: IUser;
  activatedAt?: Date | string;
  accessCode: string;
  featureLiveChat: boolean;
  featureTherapy: boolean;
  therapySessionsRemaining: number;
  therapySessionsRedeemed: number;
}

interface CreatedBy {
  id?: string;
  name: string;
  email: string;
}
