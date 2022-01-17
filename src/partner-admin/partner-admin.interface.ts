import { IPartner } from 'src/partner/partner.interface';

export interface IPartnerAdmin {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userId?: string;
  partnerId?: string;
}

export interface IPartnerAdminWithPartner extends IPartnerAdmin {
  partner: IPartner;
}
