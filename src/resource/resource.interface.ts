import { RESOURCE_CATEGORIES, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';

export interface IResource {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  slug?: string;
  status?: STORYBLOK_STORY_STATUS_ENUM;
  storyblokUuid?: string;
  category?: RESOURCE_CATEGORIES;
  completedAt?: Date | string;
}
