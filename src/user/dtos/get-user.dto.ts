import { IResource } from 'src/resource/resource.interface';
import { ITherapySession } from 'src/webhooks/webhooks.interface';
import { IPartnerAccessWithPartner } from '../../partner-access/partner-access.interface';
import { IPartnerAdminWithPartner } from '../../partner-admin/partner-admin.interface';
import { ISubscriptionUser } from '../../subscription-user/subscription-user.interface';
import { IUser } from '../user.interface';

export class GetUserDto {
  user: IUser;
  partnerAccesses?: IPartnerAccessWithPartner[];
  partnerAdmin?: IPartnerAdminWithPartner;
  resources?: IResource[];
  therapySessions?: ITherapySession[];
  subscriptions?: ISubscriptionUser[];
}
