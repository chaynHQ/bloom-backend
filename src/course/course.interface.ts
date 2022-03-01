import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';

export interface ICourse {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  name?: string;
  slug?: string;
  status?: STORYBLOK_STORY_STATUS_ENUM;
  storyblokId?: string;
}
export interface ICoursesWithSessions {
  id: string;
  name: string;
  slug: string;
  status: STORYBLOK_STORY_STATUS_ENUM;
  storyblokId: number;
  storyblokUuid: string;
  completed: boolean;
  sessions?: {
    id: string;
    name: string;
    slug: string;
    storyblokId: number;
    storyblokUuid: string;
    status: STORYBLOK_STORY_STATUS_ENUM;
    completed: boolean;
  }[];
}
