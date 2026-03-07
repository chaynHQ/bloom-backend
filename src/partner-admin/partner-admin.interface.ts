import { PartnerEntity } from 'src/entities/partner.entity';

export interface IPartnerAdmin {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userId?: string;
  partnerId?: string;
  active?: boolean;
}

export interface IPartnerAdminWithPartner extends IPartnerAdmin {
  partner: Partial<PartnerEntity>;
}
