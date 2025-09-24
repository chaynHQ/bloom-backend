import { IResource } from 'src/resource/resource.interface';
import { ITherapySession } from 'src/webhooks/webhooks.interface';
import { IPartnerAccessWithPartner } from '../../partner-access/partner-access.interface';
import { IPartnerAdminWithPartner } from '../../partner-admin/partner-admin.interface';
import { UserProfileDto } from './user-profile.dto';

export class GetUserDto {
  user: UserProfileDto;
  partnerAccesses?: IPartnerAccessWithPartner[];
  partnerAdmin?: IPartnerAdminWithPartner;
  resources?: IResource[];
  therapySessions?: ITherapySession[];
}
