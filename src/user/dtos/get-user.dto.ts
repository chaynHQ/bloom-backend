import { IPartnerAccess } from '../../partner-access/partner-access.interface';
import { IPartnerAdmin } from '../../partner-admin/partner-admin.interface';
import { IPartner } from '../../partner/partner.interface';
import { IUser } from '../user.interface';

export class GetUserDto {
  user: IUser;
  partner?: IPartner;
  partnerAccess?: IPartnerAccess;
  partnerAdmin?: IPartnerAdmin;
  courseUser?: any;
  sessionUser?: any;
}
