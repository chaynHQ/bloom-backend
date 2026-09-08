import { GetPartnerDto } from '../partner/dtos/get-partner.dto';

export interface IPartnerAdmin {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userId?: string;
  partnerId?: string;
  active?: boolean;
}

export interface IPartnerAdminWithPartner extends IPartnerAdmin {
  partner: GetPartnerDto;
}
