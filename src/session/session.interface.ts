import { ICourse } from '../course/course.interface';

export interface ISession {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  slug?: string;
  active?: boolean;
  storyBlokId?: string;
  course?: ICourse;
}
