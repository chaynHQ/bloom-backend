import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CrispService } from 'src/crisp/crisp.service';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import {
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
} from 'src/utils/constants';
import StoryblokClient from 'storyblok-js-client';
import {
  mockCourse,
  mockCourseStoryblokResult,
  mockPartnerAccessEntity,
  mockResource,
  mockResource2,
  mockResourceStoryblokResult,
  mockSession,
  mockSessionStoryblokResult,
  mockSimplybookBodyBase,
  mockTherapySessionEntity,
  mockUserEntity,
} from 'test/utils/mockData';
import {
  mockCoursePartnerRepositoryMethods,
  mockCoursePartnerServiceMethods,
  mockCourseRepositoryMethods,
  mockEventLoggerRepositoryMethods,
  mockPartnerAccessRepositoryMethods,
  mockPartnerAdminRepositoryMethods,
  mockPartnerRepositoryMethods,
  mockResourceRepositoryMethods,
  mockSessionRepositoryMethods,
  mockSlackMessageClientMethods,
  mockTherapySessionRepositoryMethods,
  mockUserRepositoryMethods,
} from 'test/utils/mockedServices';
import { ILike, Repository } from 'typeorm';
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

jest.mock('src/api/simplybook/simplybook-api', () => {
  return {
    getBookingsForDate: async () => [
      {
        bookingCode: 'bookingCodeA',
        clientEmail: 'ellie@chayn.co',
        date: new Date(2022, 9, 10),
      },
    ],
    getAuthToken: async () => {
      return 'token';
    },
  };
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  const mockedSessionRepository = createMock<Repository<SessionEntity>>(
    mockSessionRepositoryMethods,
  );
  const mockedCourseRepository = createMock<Repository<CourseEntity>>(mockCourseRepositoryMethods);
  const mockedCoursePartnerService = createMock<CoursePartnerService>(
    mockCoursePartnerServiceMethods,
  );
  const mockedResourceRepository = createMock<Repository<ResourceEntity>>(
    mockResourceRepositoryMethods,
  );
  const mockedUserRepository = createMock<Repository<UserEntity>>(mockUserRepositoryMethods);
  const mockedTherapySessionRepository = createMock<Repository<TherapySessionEntity>>(
    mockTherapySessionRepositoryMethods,
  );
  const mockedSlackMessageClient = createMock<SlackMessageClient>(mockSlackMessageClientMethods);
  const mockedPartnerAccessRepository = createMock<Repository<PartnerAccessEntity>>(
    mockPartnerAccessRepositoryMethods,
  );
  const mockedPartnerRepository = createMock<Repository<PartnerEntity>>(
    mockPartnerRepositoryMethods,
  );
  const mockedCoursePartnerRepository = createMock<Repository<CoursePartnerEntity>>(
    mockCoursePartnerRepositoryMethods,
  );
  const mockedPartnerAdminRepository = createMock<Repository<PartnerAdminEntity>>(
    mockPartnerAdminRepositoryMethods,
  );
  const mockedServiceUserProfilesService = createMock<ServiceUserProfilesService>();
  const mockCrispService = createMock<CrispService>();
  const mockEventLoggerService = createMock<EventLoggerService>();
  const mockEventLogRepository = createMock<Repository<EventLogEntity>>(
    mockEventLoggerRepositoryMethods,
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(PartnerAccessEntity),
          useValue: mockedPartnerAccessRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedUserRepository,
        },
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: mockedResourceRepository,
        },
        {
          provide: getRepositoryToken(CourseEntity),
          useValue: mockedCourseRepository,
        },
        {
          provide: getRepositoryToken(SessionEntity),
          useValue: mockedSessionRepository,
        },
        {
          provide: getRepositoryToken(CoursePartnerEntity),
          useValue: mockedCoursePartnerRepository,
        },
        {
          provide: getRepositoryToken(PartnerEntity),
          useValue: mockedPartnerRepository,
        },
        {
          provide: getRepositoryToken(TherapySessionEntity),
          useValue: mockedTherapySessionRepository,
        },
        {
          provide: getRepositoryToken(PartnerAdminEntity),
          useValue: mockedPartnerAdminRepository,
        },
        {
          provide: ServiceUserProfilesService,
          useValue: mockedServiceUserProfilesService,
        },
        {
          provide: CoursePartnerService,
          useValue: mockedCoursePartnerService,
        },
        {
          provide: SlackMessageClient,
          useValue: mockedSlackMessageClient,
        },
        PartnerService,
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: mockEventLogRepository,
        },
        { provide: CrispService, useValue: mockCrispService },
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleStoryUpdated', () => {
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

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        story_uuid: mockSession.storyblokUuid,
        text: '',
      };

      return expect(service.handleStoryUpdated(body)).rejects.toThrow('STORYBLOK STORY NOT FOUND');
    });

    it('when action is deleted, story should be set as deleted in database', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        story_id: mockSession.storyblokId,
        story_uuid: mockSession.storyblokUuid,
        text: '',
      };

      const deletedStory = (await service.handleStoryUpdated(body)) as SessionEntity;

      expect(deletedStory.status).toBe(STORYBLOK_STORY_STATUS_ENUM.DELETED);
    });

    it('when action is unpublished, story should be set as unpublished in database', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED,
        story_id: mockSession.storyblokId,
        story_uuid: mockSession.storyblokUuid,
        text: '',
      };

      const unpublished = (await service.handleStoryUpdated(body)) as SessionEntity;

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
      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOneBy')
        .mockImplementationOnce(async () => {
          return { ...mockSession, course: course2 };
        });

      const courseFindOneSpy = jest
        .spyOn(mockedCourseRepository, 'findOneByOrFail')
        .mockImplementationOnce(async () => {
          return course2;
        });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockCourse.storyblokId,
        story_uuid: mockCourse.storyblokUuid,
        text: '',
      };

      const session = (await service.handleStoryUpdated(body)) as SessionEntity;

      expect(courseFindOneSpy).toHaveBeenCalledWith({
        storyblokUuid: 'anotherCourseUuId',
      });

      expect(session).toEqual({
        ...mockSession,
        course: course2,
        courseId: 'courseId2',
      });

      expect(sessionSaveRepoSpy).toHaveBeenCalledWith({
        ...mockSession,
        courseId: 'courseId2',
        course: course2,
      });

      expect(sessionFindOneRepoSpy).toHaveBeenCalledWith({
        storyblokUuid: mockSession.storyblokUuid,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
    });

    it('when a session is new, the session should be created', async () => {
      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');

      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);

      const courseFindOneSpy = jest.spyOn(mockedCourseRepository, 'findOneByOrFail');

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        story_uuid: mockSession.storyblokUuid,
        full_slug: mockSession.slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockSession.storyblokUuid,
        storyblokId: mockSession.storyblokId,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockSession.slug,
        name: mockSession.name,
        courseId: mockSession.courseId,
      };

      const session = (await service.handleStoryUpdated(body)) as SessionEntity;

      expect(session).toEqual(expectedResponse);
      expect(courseFindOneSpy).toHaveBeenCalledWith({
        storyblokUuid: 'courseUuid1',
      });
      expect(sessionSaveRepoSpy).toHaveBeenCalledWith(expectedResponse);
      expect(sessionFindOneRepoSpy).toHaveBeenCalledWith({
        storyblokUuid: mockSession.storyblokUuid,
      });

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
    });

    it('when a session with session_iba type is new, the session should be created', async () => {
      const sessionSaveRepoSpy = jest.spyOn(mockedSessionRepository, 'save');

      const sessionFindOneRepoSpy = jest
        .spyOn(mockedSessionRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);

      const courseFindOneSpy = jest.spyOn(mockedCourseRepository, 'findOneByOrFail');

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
                    component: 'session_iba',
                  },
                },
              },
            };
          },
        };
      });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockSession.storyblokId,
        story_uuid: mockSession.storyblokUuid,
        full_slug: mockSession.slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockSession.storyblokUuid,
        storyblokId: mockSession.storyblokId,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockSession.slug,
        name: mockSession.name,
        courseId: mockSession.courseId,
      };

      const session = (await service.handleStoryUpdated(body)) as SessionEntity;

      expect(session).toEqual(expectedResponse);
      expect(sessionSaveRepoSpy).toHaveBeenCalledWith(expectedResponse);

      courseFindOneSpy.mockClear();
      sessionSaveRepoSpy.mockClear();
      sessionFindOneRepoSpy.mockClear();
    });

    it('when a course is new, the course should be created', async () => {
      const courseFindOneRepoSpy = jest
        .spyOn(mockedCourseRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);
      const courseSaveRepoSpy = jest.spyOn(mockedCourseRepository, 'save');

      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => mockCourseStoryblokResult,
        };
      });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockCourseStoryblokResult.data.story.id,
        story_uuid: mockCourseStoryblokResult.data.story.uuid,
        full_slug: mockCourseStoryblokResult.data.story.full_slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockCourseStoryblokResult.data.story.uuid,
        storyblokId: mockCourseStoryblokResult.data.story.id,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockCourseStoryblokResult.data.story.full_slug,
        name: mockCourseStoryblokResult.data.story.content.name,
      };

      const course = (await service.handleStoryUpdated(body)) as CourseEntity;

      expect(course).toEqual(expectedResponse);
      expect(courseFindOneRepoSpy).toHaveBeenCalledWith({
        storyblokUuid: mockCourseStoryblokResult.data.story.uuid,
      });

      expect(courseSaveRepoSpy).toHaveBeenCalledWith(expectedResponse);

      expect(mockedServiceUserProfilesService.createMailchimpCourseMergeField).toHaveBeenCalledWith(
        mockCourseStoryblokResult.data.story.content.name,
      );
      courseFindOneRepoSpy.mockClear();
      courseSaveRepoSpy.mockClear();
    });

    it('should handle unpublished action for a resource', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED,
        story_id: mockResource.storyblokId,
        story_uuid: mockResource.storyblokUuid,
        text: '',
      };

      const unpublishedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(unpublishedResource.status).toBe(STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED);
    });

    it('should handle published action for a resource', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResource.storyblokId,
        story_uuid: mockResource.storyblokUuid,
        text: '',
      };

      const publishedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(publishedResource.status).toBe(STORYBLOK_STORY_STATUS_ENUM.PUBLISHED);
    });

    it('should handle deleted action for a resource', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        story_id: mockResource.storyblokId,
        story_uuid: mockResource.storyblokUuid,
        text: '',
      };

      const deletedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(deletedResource.status).toBe(STORYBLOK_STORY_STATUS_ENUM.DELETED);
    });

    it('should handle a new resource', async () => {
      const resourceSaveRepoSpy = jest.spyOn(mockedResourceRepository, 'save');
      const resourceFindOneRepoSpy = jest
        .spyOn(mockedResourceRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);

      // Mock StoryblokClient to return a resource story
      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => mockResourceStoryblokResult,
        };
      });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResourceStoryblokResult.data.story.id,
        story_uuid: mockResourceStoryblokResult.data.story.uuid,
        full_slug: mockResourceStoryblokResult.data.story.full_slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockResourceStoryblokResult.data.story.uuid,
        storyblokId: mockResourceStoryblokResult.data.story.id,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: mockResourceStoryblokResult.data.story.full_slug,
        name: mockResourceStoryblokResult.data.story.name,
        category: RESOURCE_CATEGORIES.SHORT_VIDEO,
      };

      const resource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(resource).toEqual(expectedResponse);
      expect(resourceSaveRepoSpy).toHaveBeenCalledWith(expectedResponse);
      expect(resourceFindOneRepoSpy).toHaveBeenCalledWith({
        storyblokUuid: mockResourceStoryblokResult.data.story.uuid,
      });

      resourceSaveRepoSpy.mockClear();
      resourceFindOneRepoSpy.mockClear();
    });

    it('should handle updating an existing resource', async () => {
      const resourceSaveRepoSpy = jest.spyOn(mockedResourceRepository, 'save');
      const resourceFindOneRepoSpy = jest
        .spyOn(mockedResourceRepository, 'findOneBy')
        .mockImplementationOnce(async () => mockResource2);

      const updatedMockResourceStoryblokResult = { ...mockResourceStoryblokResult };
      const newName = 'New resource name';
      const newSlug = 'resources/shorts/new-resource-name';
      updatedMockResourceStoryblokResult.data.story.content.name = newName;
      updatedMockResourceStoryblokResult.data.story.full_slug = newSlug;

      // Mock StoryblokClient to return a resource story
      // eslint-disable-next-line
      // @ts-ignore
      StoryblokClient.mockImplementationOnce(() => {
        return {
          get: async () => updatedMockResourceStoryblokResult,
        };
      });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResourceStoryblokResult.data.story.id,
        story_uuid: mockResourceStoryblokResult.data.story.uuid,
        full_slug: mockResourceStoryblokResult.data.story.full_slug,
        text: '',
      };

      const expectedResponse = {
        ...mockResource2,
        storyblokUuid: mockResourceStoryblokResult.data.story.uuid,
        status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        slug: newSlug,
        name: newName,
        category: RESOURCE_CATEGORIES.SHORT_VIDEO,
      };

      const updatedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(updatedResource).toEqual(expectedResponse);
      expect(resourceSaveRepoSpy).toHaveBeenCalled();
      expect(resourceFindOneRepoSpy).toHaveBeenCalledWith({
        storyblokUuid: mockResourceStoryblokResult.data.story.uuid,
      });

      resourceSaveRepoSpy.mockClear();
      resourceFindOneRepoSpy.mockClear();
    });
  });

  describe('updatePartnerAccessTherapy', () => {
    it('should update the booking time when action is update and time is different TODO ', async () => {
      const newStartTime = '2022-09-12T09:30:00+0000';
      const newEndTime = '2022-09-12T10:30:00+0000';
      const therapyRepoFindOneSpy = jest.spyOn(mockedTherapySessionRepository, 'findOneBy');
      const booking = await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        start_date_time: newStartTime,
        end_date_time: newEndTime,
        action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
      });
      expect(booking).toHaveProperty('startDateTime', new Date(newStartTime));
      expect(booking).toHaveProperty('endDateTime', new Date(newEndTime));
      expect(therapyRepoFindOneSpy).toHaveBeenCalled();
    });

    it('should throw an error when action is on a user that doesnt exist', async () => {
      const userFindOneRepoSpy = jest
        .spyOn(mockedUserRepository, 'findOneBy')
        .mockImplementationOnce(() => undefined);
      await expect(service.updatePartnerAccessTherapy(mockSimplybookBodyBase)).rejects.toThrow(
        'UpdatePartnerAccessTherapy - error finding user with userID userId2 and origin client_email testuser@test.com',
      );
      expect(userFindOneRepoSpy).toHaveBeenCalled();
    });

    it('when creating a new therapy session and the userId is not provided, it should get userId from previous entry', async () => {
      const findTherapySessionSpy = jest
        .spyOn(mockedTherapySessionRepository, 'findOneBy')
        .mockImplementation(async () => {
          return { ...mockTherapySessionEntity, clientEmail: mockSimplybookBodyBase.client_email };
        });
      const findUserSpy = jest
        .spyOn(mockedUserRepository, 'findOneBy')
        .mockImplementationOnce(async () => {
          return mockUserEntity;
        });
      const findPartnerAccessSpy = jest
        .spyOn(mockedPartnerAccessRepository, 'find')
        .mockImplementationOnce(async () => {
          return [{ ...mockPartnerAccessEntity, userId: 'userId1' }];
        });
      const newTherapySession = await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        user_id: undefined,
        action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
      });

      expect(findTherapySessionSpy).toHaveBeenCalledWith({
        clientEmail: ILike('testuser@test.com'),
        bookingCode: ILike('abc'),
      });

      expect(findUserSpy).toHaveBeenCalledWith({
        id: 'userId1',
      });

      expect(findPartnerAccessSpy).toHaveBeenCalledWith({
        where: {
          userId: 'userId1',
          active: true,
          featureTherapy: true,
          therapySessionsRemaining: expect.objectContaining({ _value: 0 }),
        },
        relations: {
          therapySession: true,
        },
      });

      expect(newTherapySession).toEqual({
        ...mockTherapySessionEntity,
        clientEmail: mockSimplybookBodyBase.client_email,
        bookingCode: mockSimplybookBodyBase.booking_code,
        action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
        startDateTime: new Date(mockSimplybookBodyBase.start_date_time),
        endDateTime: new Date(mockSimplybookBodyBase.end_date_time),
      });
    });

    it('when creating a new therapy session and the user_id/ userId is not provided and no previousTherapySession exists, it should get userId from the userDatabase', async () => {
      const findTherapySessionSpy = jest
        .spyOn(mockedTherapySessionRepository, 'findOneBy')
        .mockImplementationOnce(async () => {
          return null;
        });
      const findUserSpy = jest.spyOn(mockedUserRepository, 'findOneBy');

      const findPartnerAccessSpy = jest
        .spyOn(mockedPartnerAccessRepository, 'find')
        .mockImplementationOnce(async () => {
          return [{ ...mockPartnerAccessEntity, userId: 'userId1' }];
        });
      const newTherapySession = await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        user_id: undefined,
        action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
      });

      expect(newTherapySession).toEqual({
        ...mockTherapySessionEntity,
        clientEmail: mockSimplybookBodyBase.client_email,
        bookingCode: mockSimplybookBodyBase.booking_code,
        action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
        startDateTime: new Date(mockSimplybookBodyBase.start_date_time),
        endDateTime: new Date(mockSimplybookBodyBase.end_date_time),
      });

      expect(findTherapySessionSpy).toHaveBeenCalledWith({
        clientEmail: ILike('testuser@test.com'),
        bookingCode: ILike('abc'),
      });
      expect(findUserSpy).toHaveBeenCalledWith({
        id: 'userId1',
      });

      expect(findPartnerAccessSpy).toHaveBeenCalledWith({
        where: {
          userId: 'userId1',
          active: true,
          featureTherapy: true,
          therapySessionsRemaining: expect.objectContaining({ _value: 0 }),
        },
        relations: {
          therapySession: true,
        },
      });
    });

    it('should not error when client email is different case to user record email', async () => {
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          client_email: 'Testuser@test.com',
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
    });

    it('should set a booking as cancelled when action is cancel', async () => {
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
    });

    it('should add therapyRemaining to original partner access when action is cancel', async () => {
      const partnerAccessSaveSpy = jest.spyOn(mockedPartnerAccessRepository, 'save');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
      expect(partnerAccessSaveSpy).toHaveBeenCalledWith({
        ...mockPartnerAccessEntity,
        therapySessionsRemaining: mockPartnerAccessEntity.therapySessionsRemaining + 1,
        therapySessionsRedeemed: mockPartnerAccessEntity.therapySessionsRedeemed - 1,
      });
    });

    it('should set a booking as cancelled when action is cancel and there are no therapy sessions remaining TODO', async () => {
      // mock that there is no therapy sessions remaining on partner access
      const partnerAccessFindSpy = jest
        .spyOn(mockedPartnerAccessRepository, 'findOneBy')
        .mockImplementationOnce(async () => {
          return { ...mockPartnerAccessEntity, therapySessionsRemaining: 0 };
        });
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
      expect(partnerAccessFindSpy).toHaveBeenCalled();
    });

    it('should throw if no partnerAccess exists when user tries to create a booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [];
      });
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).rejects.toThrow(
        'newPartnerAccessTherapy - no partner therapy access - email user@email.com userId userId2',
      );
    });

    it('should deduct therapyRemaining when user creates a new booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          { ...mockPartnerAccessEntity, therapySessionsRemaining: 6, therapySessionsRedeemed: 0 },
        ];
      });

      const partnerAccessSaveSpy = jest.spyOn(mockedPartnerAccessRepository, 'save');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING);
      expect(partnerAccessSaveSpy).toHaveBeenCalledWith(mockPartnerAccessEntity);
    });

    it('should not update partner access when user updates booking', async () => {
      const partnerAccessSaveSpy = jest.spyOn(mockedPartnerAccessRepository, 'save');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
      expect(partnerAccessSaveSpy).not.toHaveBeenCalled();
    });
    it('should error if user creates booking when no therapy sessions remaining ', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          {
            ...mockPartnerAccessEntity,
            therapySessionsRemaining: 0,
            therapySessionsRedeemed: 6,
          },
        ];
      });

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).rejects.toThrow(
        'newPartnerAccessTherapy - user has partner therapy access but has 0 therapy sessions remaining - email user@email.com userId userId2',
      );
    });
    it('if user has 2 partner access codes and booking is tied to second code, user should be able to update booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'findBy').mockImplementationOnce(async () => {
        return [
          {
            ...mockPartnerAccessEntity,
            id: 'partnerAccessId1',
            partnerId: 'partnerId1',
            therapySessionsRemaining: 6,
            therapySessionsRedeemed: 0,
          },
          {
            ...mockPartnerAccessEntity,
            id: 'partnerAccessId2',
            partnerId: 'partnerId2',
            therapySessionsRemaining: 6,
            therapySessionsRedeemed: 0,
          },
        ];
      });
      const therapySessionFindOneSpy = jest
        .spyOn(mockedTherapySessionRepository, 'findOneBy')
        .mockImplementationOnce(async (args: Partial<TherapySessionEntity>) => {
          return { ...mockTherapySessionEntity, ...args };
        });

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
      expect(therapySessionFindOneSpy).toHaveBeenCalled();
    });
  });
});
