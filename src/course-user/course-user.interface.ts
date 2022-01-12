import { IUser } from 'src/user/user.interface';
import { ICourse } from '../course/course.interface';

export interface ICourseUser {
  completed?: boolean;
  user?: IUser;
  course?: ICourse;
}
