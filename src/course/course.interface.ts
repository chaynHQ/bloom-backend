import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';

export interface ICoursesWithSessions {
  id: string;
  name: string;
  slug: string;
  status: STORYBLOK_STORY_STATUS_ENUM;
  storyblokUuid: string;
  completed: boolean;
  sessions?: {
    id: string;
    name: string;
    slug: string;
    storyblokUuid: string;
    status: STORYBLOK_STORY_STATUS_ENUM;
    completed: boolean;
  }[];
}
