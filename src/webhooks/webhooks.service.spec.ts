jest.mock('storyblok-js-client', jest.fn());

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CoursePartnerRepository } from 'src/course-partner/course-partner.repository';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { SessionRepository } from 'src/session/session.repository';
import { UserRepository } from 'src/user/user.repository';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import StoryblokClient from 'storyblok-js-client';
import {
  mockCourse,
  mockCourseStoryblokResult,
  mockSession,
  mockSessionStoryblokResult,
} from 'test/utils/mockData';
import {
  mockCoursePartnerRepositoryMethods,
  mockCourseRepositoryMethods,
  mockSessionRepositoryMethods,
} from 'test/utils/mockedServices';
import { TherapySessionRepository } from './therapy-session.repository';
import { WebhooksService } from './webhooks.service';

// Difficult to mock classes as well as node modules.
// This seemed the best approach
jest.mock('storyblok-js-client', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: async () => mockSessionStoryblokResult,
    };
  });
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  const mockedSessionRepository = createMock<SessionRepository>(mockSessionRepositoryMethods);
  const mockedCourseRepository = createMock<CourseRepository>(mockCourseRepositoryMethods);
  const mockedCoursePartnerService = createMock<CoursePartnerService>(
    mockCoursePartnerRepositoryMethods,
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        PartnerAccessRepository,
        UserRepository,
        {
          provide: CourseRepository,
          useValue: mockedCourseRepository,
        },
        {
          provide: SessionRepository,
          useValue: mockedSessionRepository,
        },
        {
          provide: CoursePartnerService,
          useValue: mockedCoursePartnerService,
        },
        TherapySessionRepository,
        CoursePartnerRepository,
        PartnerService,
        PartnerRepository,
        PartnerAdminRepository,
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateStory', () => {
    it('when story does not exist, it returns with a 404', async () => {
      // unfortunately it is mega hard to mock classes that are also node modules and this was
      // the only solution i got working
      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => {
            throw new Error('STORYBLOK STORY NOT FOUND');
          },
        };
      });
      expect.assertions(1);

      return expect(
        service.updateStory({
          action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
          story_id: mockSession.storyblokId,
          text: '',
        }),
      ).rejects.toThrowError('STORYBLOK STORY NOT FOUND');
    });

    it('when action is deleted, story should be set as deleted in database', async () => {
      const deletedStory = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;
      expect(deletedStory.status).toBe(STORYBLOK_STORY_STATUS_ENUM.DELETED);
    });

    it('when action is unpublished, story should be set as unpublished in database', async () => {
      const unpublished = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;
      expect(unpublished.status).toBe(STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED);
    });

    it('when a session has moved to a different course, the course should be updated', async () => {
      const course2 = {
        ...mockCourse,
        id: 'courseId2',
        storyblokUuid: 'anotherCourseUuid',
      };

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => {
            return {
              ...mockSessionStoryblokResult,
              data: {
                story: {
                  ...mockSessionStoryblokResult.data.story,
                  content: {
                    ...mockSessionStoryblokResult.data.story.content,
                    course: 'anotherCourseUuId',
                  },
                },
              },
            };
          },
        };
      });

      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');
      const sessionFindOneRepoSpy = jest.spyOn(mockedSessionRepository, 'findOne');

      const courseFindOneSpy = jest
        .spyOn(mockedCourseRepository, 'findOne')
        .mockImplementationOnce(async () => {
          return course2;
        });

      const session = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockCourse.storyblokId,
        text: '',
      })) as SessionEntity;

      expect(courseFindOneSpy).toBeCalledWith({
        storyblokUuid: 'anotherCourseUuId',
      });

      expect(session).toEqual({
        ...mockSession,
        course: course2,
        courseId: 'courseId2',
      });

      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
        courseId: 'courseId2',
        course: course2,
      });

      expect(sessionFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockSession.storyblokId,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
    });

    it('when a session is new, the session should be created', async () => {
      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');

      const sessionCreateRepoSpy = jest.spyOn(mockedSessionRepository, 'create');
      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOne')
        .mockImplementationOnce(async () => undefined);

      const courseFindOneSpy = jest.spyOn(mockedCourseRepository, 'findOne');

      const session = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        text: '',
      })) as SessionEntity;

      expect(session).toEqual(mockSession);
      expect(courseFindOneSpy).toBeCalledWith({
        storyblokUuid: 'courseUuid1',
      });
      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
      });
      expect(sessionSaveRepoSpy).toBeCalledWith({
        ...mockSession,
      });
      expect(sessionFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockSession.storyblokId,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
      sessionCreateRepoSpy.mockClear();
    });
    it('when a course is new, the course should be created', async () => {
      const courseFindOneRepoSpy = jest
        .spyOn(mockedCourseRepository, 'findOne')
        .mockImplementationOnce(async () => undefined);
      const courseCreateRepoSpy = jest.spyOn(mockedCourseRepository, 'create');
      const courseSaveRepoSpy = jest.spyOn(mockedCourseRepository, 'save');

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => mockCourseStoryblokResult,
        };
      });
      const course = (await service.updateStory({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: 5678,
        text: '',
      })) as CourseEntity;

      expect(course).toEqual(mockCourse);
      expect(courseFindOneRepoSpy).toBeCalledWith({
        storyblokId: mockCourseStoryblokResult.data.story.id,
      });

      expect(courseCreateRepoSpy).toBeCalledWith({
        storyblokId: mockCourseStoryblokResult.data.story.id,
        name: mockCourseStoryblokResult.data.story.name,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockCourseStoryblokResult.data.story.full_slug,
        storyblokUuid: mockCourseStoryblokResult.data.story.uuid,
      });

      expect(courseSaveRepoSpy).toBeCalledWith(mockCourse);

      courseFindOneRepoSpy.mockClear();
      courseCreateRepoSpy.mockClear();
      courseSaveRepoSpy.mockClear();
    });
  });
});
