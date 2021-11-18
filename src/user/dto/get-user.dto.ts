import { IPartnerAccess } from 'src/interfaces/partner-access.interface';
import { IPartnerAdmin } from 'src/interfaces/partner-admin.interface';
import { IPartner } from 'src/interfaces/partner.interface';
import { IUser } from 'src/interfaces/user.interface';

export class GetUserDto {
  user: IUser;
  partner?: IPartner;
  partnerAccess?: IPartnerAccess;
  partnerAdmin?: IPartnerAdmin;
}
