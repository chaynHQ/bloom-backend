import { ICourseUser } from 'src/course-user/course-user.interface';
import { ISession } from 'src/session/session.interface';

export interface ISessionUser {
  completed?: boolean;
  session?: ISession;
  courseUser?: ICourseUser;
}
