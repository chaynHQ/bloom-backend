import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { ICourse } from '../course/course.interface';

export interface ISession {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  slug?: string;
  status?: STORYBLOK_STORY_STATUS_ENUM;
  storyBlokId?: string;
  course?: ICourse;
}
