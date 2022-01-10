import { SIMPLYBOOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { IPartnerAccess } from '../../partner-access/partner-access.interface';
import { IPartnerAdmin } from '../../partner-admin/partner-admin.interface';
import { IPartner } from '../../partner/partner.interface';
import { IUser } from '../user.interface';

export class GetUserDto {
  user: IUser;
  partner?: IPartner;
  partnerAccess?: IPartnerAccess;
  partnerAdmin?: IPartnerAdmin;
  course?: {
    id: string;
    name: string;
    slug: string;
    status: SIMPLYBOOK_STORY_STATUS_ENUM;
    storyblokid: string;
    completed: boolean;
    session?: {
      id: string;
      name: string;
      slug: string;
      storyblokid: string;
      status: SIMPLYBOOK_STORY_STATUS_ENUM;
      completed: boolean;
    }[];
  }[];
}
