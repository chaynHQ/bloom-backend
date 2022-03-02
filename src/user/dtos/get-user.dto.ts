import { ICoursesWithSessions } from 'src/course/course.interface';
import { IPartnerAccessWithPartner } from '../../partner-access/partner-access.interface';
import { IPartnerAdminWithPartner } from '../../partner-admin/partner-admin.interface';
import { IUser } from '../user.interface';

export class GetUserDto {
  user: IUser;
  partnerAccesses?: IPartnerAccessWithPartner[];
  partnerAdmin?: IPartnerAdminWithPartner;
  courses?: ICoursesWithSessions[];
}
