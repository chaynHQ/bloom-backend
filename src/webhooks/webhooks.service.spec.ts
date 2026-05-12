import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import apiCall from 'src/api/apiCalls';
import * as simplybookApi from 'src/api/simplybook/simplybook-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import {
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_STORY_STATUS_ENUM,
} from 'src/utils/constants';
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
  mockSimplybookBookingDetails,
  mockSimplybookWebhookDto,
  mockTherapySessionEntity,
  mockUserEntity,
} from 'test/utils/mockData';
import {
  mockCoursePartnerRepositoryMethods,
  mockCoursePartnerServiceMethods,
  mockCourseRepositoryMethods,
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
import { SimplybookNotificationType } from './dto/simplybook-webhook.dto';
import { WebhooksService } from './webhooks.service';

jest.mock('src/api/apiCalls');

jest.mock('src/utils/constants', () => {
  const actual = jest.requireActual('src/utils/constants');
  return {
    ...actual,
    storyblokToken: 'test-storyblok-token',
    simplybookCompanyName: 'chayn',
  };
});

jest.mock('src/api/simplybook/simplybook-api', () => {
  return {
    getBookingDetails: jest.fn(async () => ({
      id: 123,
      code: 'abc',
      start_datetime: '2022-09-12T07:30:00+0000',
      end_datetime: '2022-09-12T08:30:00+0000',
      service: { name: 'bloom therapy' },
      provider: { name: 'Therapist name', email: 'therapist@test.com' },
      client: { email: 'testuser@test.com' },
      additional_fields: [{ id: 1, field_name: 'user_id', value: 'userId2' }],
    })),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    (apiCall as jest.Mock).mockClear().mockResolvedValue(mockSessionStoryblokResult);

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
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleStoryUpdated', () => {
    it('when story does not exist, it returns with a 404', async () => {
      (apiCall as jest.Mock).mockRejectedValueOnce({ status: 404 });

      expect.assertions(1);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: mockSession.slug,
        text: '',
      };

      return expect(service.handleStoryUpdated(body)).rejects.toThrow(
        `Storyblok webhook failed - story not found in storyblok for story ${mockSession.slug}`,
      );
    });

    it('when action is deleted, story should be set as deleted in database', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        full_slug: mockSession.slug,
        text: '',
      };

      const deletedStory = (await service.handleStoryUpdated(body)) as SessionEntity;

      expect(deletedStory.status).toBe(STORYBLOK_STORY_STATUS_ENUM.DELETED);
    });

    it('when action is unpublished, story should be set as unpublished in database', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED,
        full_slug: mockSession.slug,
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

      (apiCall as jest.Mock).mockResolvedValueOnce({
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
        full_slug: mockCourse.slug,
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
        full_slug: mockSession.slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockSession.storyblokUuid,
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

      (apiCall as jest.Mock).mockResolvedValueOnce({
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
      });

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: mockSession.slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockSession.storyblokUuid,
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

      (apiCall as jest.Mock).mockResolvedValueOnce(mockCourseStoryblokResult);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockCourseStoryblokResult.data.story.id,
        full_slug: mockCourseStoryblokResult.data.story.full_slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockCourseStoryblokResult.data.story.uuid,
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
        full_slug: mockResource.slug,
        text: '',
      };

      const unpublishedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(unpublishedResource.status).toBe(STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED);
    });

    it('should handle published action for a resource', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: mockResource.slug,
        text: '',
      };

      const publishedResource = (await service.handleStoryUpdated(body)) as ResourceEntity;

      expect(publishedResource.status).toBe(STORYBLOK_STORY_STATUS_ENUM.PUBLISHED);
    });

    it('should handle deleted action for a resource', async () => {
      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.DELETED,
        full_slug: mockResource.slug,
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

      (apiCall as jest.Mock).mockResolvedValueOnce(mockResourceStoryblokResult);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResourceStoryblokResult.data.story.id,
        full_slug: mockResourceStoryblokResult.data.story.full_slug,
        text: '',
      };

      const expectedResponse = {
        storyblokUuid: mockResourceStoryblokResult.data.story.uuid,
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

      (apiCall as jest.Mock).mockResolvedValueOnce(updatedMockResourceStoryblokResult);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResourceStoryblokResult.data.story.id,
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

      (apiCall as jest.Mock).mockResolvedValueOnce(updatedMockResourceStoryblokResult);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        story_id: mockResourceStoryblokResult.data.story.id,
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
        'UpdatePartnerAccessTherapy - error finding user with userID userId2 - User not found',
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

    it('should credit therapyRemaining back to original partner access when action is cancel', async () => {
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      const decrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'decrement');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
      expect(incrementSpy).toHaveBeenCalledWith(
        { id: mockTherapySessionEntity.partnerAccessId },
        'therapySessionsRemaining',
        1,
      );
      expect(decrementSpy).toHaveBeenCalledWith(
        { id: mockTherapySessionEntity.partnerAccessId },
        'therapySessionsRedeemed',
        1,
      );
    });

    it('should still credit back when partner access has zero remaining (cancel path uses atomic increment)', async () => {
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);
      expect(incrementSpy).toHaveBeenCalledWith(
        { id: mockTherapySessionEntity.partnerAccessId },
        'therapySessionsRemaining',
        1,
      );
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
      ).rejects.toThrow('newPartnerAccessTherapy - no partner therapy access - userId userId2');
    });

    it('should deduct therapyRemaining when user creates a new booking', async () => {
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          { ...mockPartnerAccessEntity, therapySessionsRemaining: 6, therapySessionsRedeemed: 0 },
        ];
      });

      const decrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'decrement');
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING);
      expect(decrementSpy).toHaveBeenCalledWith(
        { id: mockPartnerAccessEntity.id },
        'therapySessionsRemaining',
        1,
      );
      expect(incrementSpy).toHaveBeenCalledWith(
        { id: mockPartnerAccessEntity.id },
        'therapySessionsRedeemed',
        1,
      );
    });

    it('should not increment/decrement partner access counters when user updates booking', async () => {
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      const decrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'decrement');
      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          ...{ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING },
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
      expect(incrementSpy).not.toHaveBeenCalled();
      expect(decrementSpy).not.toHaveBeenCalled();
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
        'newPartnerAccessTherapy - user has partner therapy access but has 0 therapy sessions remaining - userId userId2',
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

  describe('handleSimplybookWebhook', () => {
    let getBookingDetailsSpy: jest.SpyInstance;
    let updateTherapySpy: jest.SpyInstance;

    beforeEach(() => {
      getBookingDetailsSpy = jest.spyOn(simplybookApi, 'getBookingDetails');
      updateTherapySpy = jest
        .spyOn(service, 'updatePartnerAccessTherapy')
        .mockResolvedValue(mockTherapySessionEntity);
    });

    it('should return undefined and not call Simplybook API for notify type', async () => {
      const result = await service.handleSimplybookWebhook({
        ...mockSimplybookWebhookDto,
        notification_type: SimplybookNotificationType.NOTIFY,
      });
      expect(result).toBeUndefined();
      expect(getBookingDetailsSpy).not.toHaveBeenCalled();
    });

    it('should fetch booking details and map create to NEW_BOOKING', async () => {
      await service.handleSimplybookWebhook({
        ...mockSimplybookWebhookDto,
        notification_type: SimplybookNotificationType.CREATE,
      });
      expect(getBookingDetailsSpy).toHaveBeenCalledWith(mockSimplybookWebhookDto.booking_id);
      expect(updateTherapySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
          booking_code: 'abc',
          client_email: 'testuser@test.com',
          user_id: 'userId2',
        }),
      );
    });

    it('should map cancel to CANCELLED_BOOKING', async () => {
      await service.handleSimplybookWebhook({
        ...mockSimplybookWebhookDto,
        notification_type: SimplybookNotificationType.CANCEL,
      });
      expect(updateTherapySpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING }),
      );
    });

    it('should map change to UPDATED_BOOKING', async () => {
      await service.handleSimplybookWebhook({
        ...mockSimplybookWebhookDto,
        notification_type: SimplybookNotificationType.CHANGE,
      });
      expect(updateTherapySpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING }),
      );
    });

    it('should pass undefined user_id when not present in additional_fields', async () => {
      getBookingDetailsSpy.mockResolvedValueOnce({
        ...mockSimplybookBookingDetails,
        additional_fields: [],
      });
      await service.handleSimplybookWebhook(mockSimplybookWebhookDto);
      expect(updateTherapySpy).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: undefined }),
      );
    });

    it('should reject when company does not match', async () => {
      await expect(
        service.handleSimplybookWebhook({
          ...mockSimplybookWebhookDto,
          company: 'someone-else',
        }),
      ).rejects.toThrow(/unexpected company/);
      expect(getBookingDetailsSpy).not.toHaveBeenCalled();
    });
  });
});
