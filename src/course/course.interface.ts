import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';

export interface ICourse {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  slug?: string;
  status?: STORYBLOK_STORY_STATUS_ENUM;
  active?: boolean;
  storyblokId?: string;
}
