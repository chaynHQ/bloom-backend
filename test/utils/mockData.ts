import { CourseEntity } from 'src/entities/course.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { StoryblokResult } from 'storyblok-js-client';

export const mockSessionStoryblokResult = {
  data: {
    story: {
      name: 'What are boundaries?',
      created_at: '2022-05-05T11:28:07.941Z',
      published_at: '2022-05-05T11:28:37.572Z',
      id: 123456,
      uuid: 'sessionStoryblokUuid1',
      content: {
        _uid: 'courseUuid',
        name: 'What are boundaries?',
        bonus: '',
        video: { id: '', url: '', linktype: 'story', fieldtype: 'multilink', cached_url: '' },
        course: 'courseUuid1',
        activity: '',
        component: 'Session',
        coming_soon: true,
        description:
          'In this session we start to define what boundaries are, explore why boundaries are so important, and reflect on what boundary violations can mean.',
      },
      slug: 'what-are-boundaries',
      full_slug: 'courses/creating-boundaries/what-are-boundaries',
    },
  },
  perPage: 1,
  total: 1,
  headers: 1,
} as StoryblokResult;

export const mockCourseStoryblokResult = {
  data: {
    story: {
      name: 'Overview',
      created_at: '2022-05-05T11:29:10.888Z',
      published_at: '2022-05-19T16:32:44.502Z',
      id: 5678,
      uuid: 'courseUuid1',
      content: {
        _uid: '12345',
        name: 'Recovering from toxic and abusive relationships',
        video: { id: '', url: '', linktype: 'story', fieldtype: 'multilink', cached_url: '' },
        weeks: [],
        component: 'Course',
        coming_soon: true,
        description:
          'Abuse can happen to anyone - and it’s never the survivor’s fault. In this course, we discuss abusive tactics, the cycle of coercive control, the science of trauma, and how abuse can affect our boundaries, relationships, and coping mechanisms. We empower ourselves to build positive self-esteem with tools such as journaling, somatic practice, and community.',
      },
      slug: 'recovering-from-toxic-and-abusive-relationships',
      full_slug: 'courses/recovering-from-toxic-and-abusive-relationships/',
    },
  },
  perPage: 1,
  total: 1,
  headers: 1,
} as StoryblokResult;

export const mockCourse: CourseEntity = {
  coursePartner: [],
  courseUser: [],
  id: 'courseId1',
  storyblokId: 123456,
  storyblokUuid: 'courseUuid1',
  slug: '/slug/slug',
  status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
  name: 'course name',
  createdAt: new Date(100),
  updatedAt: new Date(100),
  session: [],
};

export const mockSession: SessionEntity = {
  sessionUser: [],
  id: 'sessionId1',
  storyblokId: 123456,
  storyblokUuid: 'sessionStoryblokUuid1',
  slug: 'courses/creating-boundaries/what-are-boundaries',
  status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
  name: 'What are boundaries?',
  createdAt: new Date(100),
  updatedAt: new Date(100),
  courseId: 'courseId1',
  course: { ...mockCourse },
};
