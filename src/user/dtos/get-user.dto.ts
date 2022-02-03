import { IPartnerAccessWithPartner } from '../../partner-access/partner-access.interface';
import { IPartnerAdminWithPartner } from '../../partner-admin/partner-admin.interface';
import { STORYBLOK_STORY_STATUS_ENUM } from '../../utils/constants';
import { IUser } from '../user.interface';

export class GetUserDto {
  user: IUser;
  partnerAccesses?: IPartnerAccessWithPartner[];
  partnerAdmin?: IPartnerAdminWithPartner;
  courses?: {
    id: string;
    name: string;
    slug: string;
    status: STORYBLOK_STORY_STATUS_ENUM;
    storyblokId: string;
    completed: boolean;
    sessions?: {
      id: string;
      name: string;
      slug: string;
      storyblokId: string;
      status: STORYBLOK_STORY_STATUS_ENUM;
      completed: boolean;
    }[];
  }[];
}
