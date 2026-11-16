import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpStatus } from '@nestjs/common';
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
import { ChatUserService } from 'src/chat-user/chat-user.service';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import {
  RESOURCE_CATEGORIES,
  SIMPLYBOOK_ACTION_ENUM,
  STORYBLOK_PAGE_COMPONENTS,
  STORYBLOK_STORY_STATUS_ENUM,
  THEMES,
} from 'src/utils/constants';
import {
  mockCourse,
  mockCourseStoryblokResult,
  mockAllPartnerEntities,
  mockAltPartnerEntity,
  mockBumbleForFriendsPartnerEntity,
  mockFruitzPartnerEntity,
  mockPartnerAccessEntity,
  mockPartnerEntity,
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
import { createQueryBuilderMock, partnerLookupQueryBuilderMock } from 'test/utils/mockUtils';
import { ILike, In, Repository } from 'typeorm';
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
  let mockedPartnerRepository: DeepMocked<Repository<PartnerEntity>>;
  let partnerService: PartnerService;
  const mockedCoursePartnerRepository = createMock<Repository<CoursePartnerEntity>>(
    mockCoursePartnerRepositoryMethods,
  );
  const mockedPartnerAdminRepository = createMock<Repository<PartnerAdminEntity>>(
    mockPartnerAdminRepositoryMethods,
  );
  const mockedServiceUserProfilesService = createMock<ServiceUserProfilesService>();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedPartnerRepository = createMock<Repository<PartnerEntity>>(mockPartnerRepositoryMethods);

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
        {
          provide: ChatUserService,
          useValue: createMock<ChatUserService>(),
        },
        PartnerService,
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    partnerService = module.get<PartnerService>(PartnerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleStoryUpdated', () => {
    it('when story does not exist, it returns with a 404 after one retry', async () => {
      service.storyNotFoundRetryDelayMs = 0;
      (apiCall as jest.Mock).mockRejectedValueOnce({ status: 404 });
      (apiCall as jest.Mock).mockRejectedValueOnce({ status: 404 });

      expect.assertions(2);

      const body = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: mockSession.slug,
        text: '',
      };

      await expect(service.handleStoryUpdated(body)).rejects.toThrow(
        `Storyblok webhook failed - story not found in storyblok for story ${mockSession.slug}`,
      );
      expect(apiCall).toHaveBeenCalledTimes(2);
    });

    it('retries a newly published story the CDN does not serve yet', async () => {
      service.storyNotFoundRetryDelayMs = 0;
      (apiCall as jest.Mock).mockRejectedValueOnce({ status: 404 });
      (apiCall as jest.Mock).mockResolvedValueOnce({
        data: {
          story: {
            uuid: 'bffStoryUuid',
            slug: 'bff',
            full_slug: 'partners/bff',
            content: { component: STORYBLOK_PAGE_COMPONENTS.PARTNER, name: 'Bumble For Friends' },
          },
        },
      });
      mockedPartnerRepository.findOneBy.mockResolvedValue(null);
      mockedPartnerRepository.createQueryBuilder.mockImplementation(
        partnerLookupQueryBuilderMock([]) as never,
      );

      await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: 'partners/bff',
        text: '',
      });

      expect(mockedPartnerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'bff', isActive: false }),
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
        themes: [THEMES.SETTING_BOUNDARIES],
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
        themes: [THEMES.SETTING_BOUNDARIES],
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
        themes: [THEMES.SETTING_BOUNDARIES],
        resources: [],
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

    describe('modular course resources', () => {
      const courseBody = {
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: mockCourseStoryblokResult.data.story.full_slug,
        text: '',
      };
      const courseStory = (content: Record<string, unknown>) => ({
        ...mockCourseStoryblokResult,
        data: {
          story: {
            ...mockCourseStoryblokResult.data.story,
            content: { ...mockCourseStoryblokResult.data.story.content, ...content },
          },
        },
      });

      const existingResource = (uuid: string) => ({
        ...mockResource,
        id: `id-${uuid}`,
        storyblokUuid: uuid,
      });

      it('links the course to the resources it lists', async () => {
        (apiCall as jest.Mock).mockResolvedValueOnce(
          courseStory({ sessions: ['courseResource1', 'courseResource2'] }),
        );
        const findBySpy = jest
          .spyOn(mockedResourceRepository, 'findBy')
          .mockResolvedValueOnce([
            existingResource('courseResource1'),
            existingResource('courseResource2'),
          ]);

        const course = (await service.handleStoryUpdated(courseBody)) as CourseEntity;

        expect(findBySpy).toHaveBeenCalledWith({
          storyblokUuid: In(['courseResource1', 'courseResource2']),
        });
        expect(course.resources.map((r) => r.storyblokUuid)).toEqual([
          'courseResource1',
          'courseResource2',
        ]);
        expect(apiCall).toHaveBeenCalledTimes(1);
      });

      it('links the resources listed in every language', async () => {
        (apiCall as jest.Mock)
          .mockResolvedValueOnce(
            courseStory({ sessions: ['courseResource1'], languages: ['default', 'tr', 'ar'] }),
          )
          .mockResolvedValueOnce(courseStory({ sessions: ['courseResource1', 'courseResource2'] }))
          .mockResolvedValueOnce(courseStory({ sessions: ['courseResource3'] }));
        const findBySpy = jest
          .spyOn(mockedResourceRepository, 'findBy')
          .mockResolvedValueOnce([
            existingResource('courseResource1'),
            existingResource('courseResource2'),
            existingResource('courseResource3'),
          ]);

        await service.handleStoryUpdated(courseBody);

        expect(apiCall).toHaveBeenCalledWith({
          url: expect.stringContaining(
            `cdn/stories/${mockCourseStoryblokResult.data.story.uuid}?find_by=uuid&language=tr`,
          ),
          type: 'get',
        });
        expect(findBySpy).toHaveBeenCalledWith({
          storyblokUuid: In(['courseResource1', 'courseResource2', 'courseResource3']),
        });
      });

      it('changes nothing when a language fetch fails', async () => {
        (apiCall as jest.Mock)
          .mockResolvedValueOnce(courseStory({ sessions: ['courseResource1'], languages: ['tr'] }))
          .mockRejectedValueOnce(new Error('rate limited'));
        const saveSpy = jest.spyOn(mockedCourseRepository, 'save');

        await expect(service.handleStoryUpdated(courseBody)).rejects.toThrow('rate limited');
        expect(saveSpy).not.toHaveBeenCalled();
        saveSpy.mockClear();
      });

      it('creates the row for a listed resource that was never synced', async () => {
        (apiCall as jest.Mock)
          .mockResolvedValueOnce(courseStory({ sessions: ['courseResource1', 'resourceUuid2'] }))
          .mockResolvedValueOnce({ data: { stories: [mockResourceStoryblokResult.data.story] } });
        jest
          .spyOn(mockedResourceRepository, 'findBy')
          .mockResolvedValueOnce([existingResource('courseResource1')]);
        jest.spyOn(mockedResourceRepository, 'findOneBy').mockResolvedValueOnce(undefined);

        const course = (await service.handleStoryUpdated(courseBody)) as CourseEntity;

        expect(apiCall).toHaveBeenCalledWith({
          url: expect.stringContaining('cdn/stories?by_uuids=resourceUuid2&'),
          type: 'get',
        });
        expect(course.resources.map((r) => r.storyblokUuid)).toEqual([
          'courseResource1',
          'resourceUuid2',
        ]);
      });

      it('clears the links when the sessions field is emptied', async () => {
        (apiCall as jest.Mock).mockResolvedValueOnce(courseStory({ sessions: [] }));

        const course = (await service.handleStoryUpdated(courseBody)) as CourseEntity;

        expect(course.resources).toEqual([]);
      });

      it('links nothing for a course without the sessions field', async () => {
        (apiCall as jest.Mock).mockResolvedValueOnce(mockCourseStoryblokResult);
        const findBySpy = jest.spyOn(mockedResourceRepository, 'findBy');

        const course = (await service.handleStoryUpdated(courseBody)) as CourseEntity;

        expect(course.resources).toEqual([]);
        expect(findBySpy).not.toHaveBeenCalled();
      });
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
        category: RESOURCE_CATEGORIES.VIDEO,
        themes: [THEMES.RECOGNISING_ABUSE],
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
      const newSlug = 'video/new-resource-name';
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
        category: RESOURCE_CATEGORIES.VIDEO,
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
      const newSlug = 'video/new-resource-name';
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
        category: RESOURCE_CATEGORIES.VIDEO,
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

    const buildResourceStoryblokResult = (component: string, fullSlug: string, uuid?: string) => ({
      ...mockResourceStoryblokResult,
      data: {
        story: {
          ...mockResourceStoryblokResult.data.story,
          ...(uuid ? { uuid } : {}),
          content: {
            ...mockResourceStoryblokResult.data.story.content,
            component,
          },
          full_slug: fullSlug,
        },
      },
    });

    it('should derive category "written" and create a resource for a resource_written story', async () => {
      const resourceSaveRepoSpy = jest.spyOn(mockedResourceRepository, 'save');
      jest
        .spyOn(mockedResourceRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);

      const storyblokResult = buildResourceStoryblokResult(
        STORYBLOK_PAGE_COMPONENTS.RESOURCE_WRITTEN,
        'written/a-written-resource',
        'resourceWrittenUuid',
      );
      (apiCall as jest.Mock).mockResolvedValueOnce(storyblokResult);

      const resource = (await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: storyblokResult.data.story.full_slug,
        text: '',
      })) as ResourceEntity;

      expect(resource.category).toBe(RESOURCE_CATEGORIES.WRITTEN);
      expect(resource.storyblokUuid).toBe('resourceWrittenUuid');
      expect(resourceSaveRepoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: RESOURCE_CATEGORIES.WRITTEN }),
      );

      resourceSaveRepoSpy.mockClear();
    });

    it('should write category on update when an existing resource changed component', async () => {
      const resourceSaveRepoSpy = jest.spyOn(mockedResourceRepository, 'save');
      jest.spyOn(mockedResourceRepository, 'findOneBy').mockImplementationOnce(async () => ({
        ...mockResource2,
        category: RESOURCE_CATEGORIES.AUDIO,
      }));

      const storyblokResult = buildResourceStoryblokResult(
        STORYBLOK_PAGE_COMPONENTS.RESOURCE_VIDEO,
        'video/resource-name',
      );
      (apiCall as jest.Mock).mockResolvedValueOnce(storyblokResult);

      const updatedResource = (await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: storyblokResult.data.story.full_slug,
        text: '',
      })) as ResourceEntity;

      expect(updatedResource.category).toBe(RESOURCE_CATEGORIES.VIDEO);
      expect(resourceSaveRepoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockResource2.id,
          category: RESOURCE_CATEGORIES.VIDEO,
          slug: 'video/resource-name',
        }),
      );

      resourceSaveRepoSpy.mockClear();
    });

    it('should derive category "grounding" and create a resource for a resource_grounding story', async () => {
      const resourceSaveRepoSpy = jest.spyOn(mockedResourceRepository, 'save');
      jest
        .spyOn(mockedResourceRepository, 'findOneBy')
        .mockImplementationOnce(async () => undefined);

      const storyblokResult = buildResourceStoryblokResult(
        STORYBLOK_PAGE_COMPONENTS.RESOURCE_GROUNDING,
        'grounding/a-grounding-exercise',
        'resourceGroundingUuid',
      );
      (apiCall as jest.Mock).mockResolvedValueOnce(storyblokResult);

      const resource = (await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: storyblokResult.data.story.full_slug,
        text: '',
      })) as ResourceEntity;

      expect(resource.category).toBe(RESOURCE_CATEGORIES.GROUNDING);
      expect(resource.storyblokUuid).toBe('resourceGroundingUuid');
      expect(resourceSaveRepoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: RESOURCE_CATEGORIES.GROUNDING }),
      );

      resourceSaveRepoSpy.mockClear();
    });
  });

  describe('partner stories', () => {
    const partnerStory = (
      overrides: Partial<{ slug: string; name: string; uuid: string }> = {},
    ) => {
      const { slug = 'bff', name = 'Bumble For Friends', uuid = 'partnerStoryUuid' } = overrides;
      return {
        data: {
          story: {
            id: 999,
            uuid,
            name,
            slug,
            full_slug: `partners/${slug}`,
            content: { _uid: 'p1', component: STORYBLOK_PAGE_COMPONENTS.PARTNER, name },
          },
        },
      };
    };

    const publish = (story: ReturnType<typeof partnerStory>) => {
      (apiCall as jest.Mock).mockResolvedValueOnce(story);
      return service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: story.data.story.full_slug,
        text: '',
      });
    };

    // Rows the partner repository finds by equality and by the name query
    const usePartnerRows = (rows: Partial<PartnerEntity>[]) => {
      mockedPartnerRepository.findOneBy.mockImplementation(
        (async (where: Partial<PartnerEntity>) =>
          rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ??
          null) as never,
      );
      mockedPartnerRepository.createQueryBuilder.mockImplementation(
        partnerLookupQueryBuilderMock(rows as PartnerEntity[]) as never,
      );
    };

    const logger = () =>
      (service as unknown as { logger: { warn: jest.Mock; error: jest.Mock } }).logger;

    beforeEach(() => {
      jest.spyOn(logger(), 'warn').mockImplementation(() => undefined);
      jest.spyOn(logger(), 'error').mockImplementation(() => undefined);
    });

    it('creates an unknown partner inactive, with a therapy limit of 0', async () => {
      usePartnerRows([]);

      await publish(partnerStory());

      expect(mockedPartnerRepository.save).toHaveBeenCalledTimes(1);
      expect(mockedPartnerRepository.save).toHaveBeenCalledWith({
        name: 'Bumble For Friends',
        slug: 'bff',
        storyblokUuid: 'partnerStoryUuid',
        isActive: false,
        therapySessionsPerCode: 0,
      });
    });

    it('links an existing row by slug, leaving it active', async () => {
      const existing = { ...mockBumbleForFriendsPartnerEntity, isActive: true, name: 'Old Name' };
      usePartnerRows([existing]);

      await publish(partnerStory());

      expect(mockedPartnerRepository.save).toHaveBeenCalledWith({
        ...existing,
        storyblokUuid: 'partnerStoryUuid',
      });
      expect(logger().warn).toHaveBeenCalledWith(expect.stringContaining('Old Name'));
    });

    it('links an existing row by name when no slug matches, keeping its slug', async () => {
      // e.g. a row made by POST /v1/partner, which slugifies the name
      usePartnerRows([{ ...mockBumbleForFriendsPartnerEntity, slug: 'bumble-for-friends' }]);

      await publish(partnerStory({ name: 'BUMBLE FOR FRIENDS' }));

      expect(mockedPartnerRepository.save).toHaveBeenCalledWith({
        ...mockBumbleForFriendsPartnerEntity,
        slug: 'bumble-for-friends',
        storyblokUuid: 'partnerStoryUuid',
      });
      expect(logger().warn).toHaveBeenCalledWith(expect.stringContaining('slug bff'));
    });

    it('does not link Bumble to a Bumble For Friends story', async () => {
      usePartnerRows([mockPartnerEntity, mockAltPartnerEntity, mockFruitzPartnerEntity]);

      await publish(partnerStory());

      expect(mockedPartnerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'bff', isActive: false }),
      );
      expect(mockedPartnerRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.anything() }),
      );
    });

    it('never renames or reactivates a row found by its Storyblok uuid', async () => {
      // Bumble For Friends is inactive until a super admin launches it
      usePartnerRows([{ ...mockBumbleForFriendsPartnerEntity, storyblokUuid: 'partnerStoryUuid' }]);

      await publish(partnerStory({ slug: 'bumble-friends', name: 'Bumble Friends' }));

      expect(mockedPartnerRepository.save).not.toHaveBeenCalled();
      expect(logger().warn).toHaveBeenCalledWith(expect.stringContaining('slug bumble-friends'));
      expect(logger().warn).toHaveBeenCalledWith(expect.stringContaining('name Bumble Friends'));
    });

    it('runs for a moved partner story too', async () => {
      usePartnerRows([]);
      const story = partnerStory();
      (apiCall as jest.Mock).mockResolvedValueOnce(story);

      await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.MOVED,
        full_slug: story.data.story.full_slug,
        text: '',
      });

      expect(mockedPartnerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'bff', isActive: false }),
      );
    });

    it('leaves a row linked to a different story unchanged, logging it', async () => {
      usePartnerRows([{ ...mockBumbleForFriendsPartnerEntity, storyblokUuid: 'otherStoryUuid' }]);

      await publish(partnerStory());

      expect(mockedPartnerRepository.save).not.toHaveBeenCalled();
      expect(logger().warn).toHaveBeenCalledWith(expect.stringContaining('otherStoryUuid'));
    });

    it('fails the webhook with a 500 when the row cannot be saved', async () => {
      usePartnerRows([]);
      mockedPartnerRepository.save.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(publish(partnerStory())).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      expect(logger().error).toHaveBeenCalledWith(expect.stringContaining('duplicate key'));
    });

    it('republishing a linked story changes nothing', async () => {
      usePartnerRows([{ ...mockBumbleForFriendsPartnerEntity, storyblokUuid: 'partnerStoryUuid' }]);

      await publish(partnerStory());

      expect(mockedPartnerRepository.save).not.toHaveBeenCalled();
      expect(logger().warn).not.toHaveBeenCalled();
    });

    it('skips a story with an empty name, logging an error', async () => {
      usePartnerRows([]);

      await publish(partnerStory({ name: '  ' }));

      expect(mockedPartnerRepository.save).not.toHaveBeenCalled();
      expect(logger().error).toHaveBeenCalled();
    });

    it.each([STORYBLOK_STORY_STATUS_ENUM.UNPUBLISHED, STORYBLOK_STORY_STATUS_ENUM.DELETED])(
      '%s is a no-op',
      async (action) => {
        usePartnerRows([
          { ...mockBumbleForFriendsPartnerEntity, storyblokUuid: 'partnerStoryUuid' },
        ]);
        mockedCourseRepository.findOneBy.mockResolvedValueOnce(null);
        mockedSessionRepository.findOneBy.mockResolvedValueOnce(null);
        mockedResourceRepository.findOneBy.mockResolvedValueOnce(null);
        (apiCall as jest.Mock).mockResolvedValueOnce(partnerStory());

        await expect(
          service.handleStoryUpdated({
            action,
            full_slug: 'partners/bff',
            text: '',
          }),
        ).resolves.toBeUndefined();

        expect(mockedPartnerRepository.save).not.toHaveBeenCalled();
        expect(mockedCourseRepository.save).not.toHaveBeenCalled();
        expect(mockedSessionRepository.save).not.toHaveBeenCalled();
        expect(mockedResourceRepository.save).not.toHaveBeenCalled();
      },
    );

    it('a course tagged Public and Bumble For Friends links Bumble For Friends only, not Bumble', async () => {
      mockedPartnerRepository.createQueryBuilder.mockImplementation(
        partnerLookupQueryBuilderMock(mockAllPartnerEntities) as never,
      );
      mockedCoursePartnerRepository.createQueryBuilder.mockImplementationOnce(
        createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) }) as never,
      );
      const coursePartnerService = new CoursePartnerService(
        mockedCoursePartnerRepository,
        partnerService,
      );
      mockedCoursePartnerService.updateCoursePartners.mockImplementationOnce((partners, courseId) =>
        coursePartnerService.updateCoursePartners(partners, courseId),
      );
      const courseStory = {
        ...mockCourseStoryblokResult,
        data: {
          story: {
            ...mockCourseStoryblokResult.data.story,
            content: {
              ...mockCourseStoryblokResult.data.story.content,
              included_for_partners: ['Public', 'Bumble For Friends'],
            },
          },
        },
      };
      (apiCall as jest.Mock).mockResolvedValueOnce(courseStory);

      const course = (await service.handleStoryUpdated({
        action: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        full_slug: courseStory.data.story.full_slug,
        text: '',
      })) as CourseEntity;

      expect(mockedCoursePartnerRepository.save).toHaveBeenCalledTimes(1);
      expect(mockedCoursePartnerRepository.save).toHaveBeenCalledWith({
        partnerId: mockBumbleForFriendsPartnerEntity.id,
        courseId: course.id,
        active: true,
      });
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

    it('should throw CONFLICT and alert Slack when incoming booking_id does not match the existing record', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      const decrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'decrement');

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
          booking_id: 99999,
        }),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('bookingId mismatch'),
      });

      expect(slackSpy).toHaveBeenCalledWith(expect.stringContaining('bookingId mismatch'));
      // No counter mutation should have happened on the mismatch path.
      expect(incrementSpy).not.toHaveBeenCalled();
      expect(decrementSpy).not.toHaveBeenCalled();
    });

    it('should NOT credit back on a duplicate cancel when cancelledAt is already set', async () => {
      jest.spyOn(mockedTherapySessionRepository, 'findOneBy').mockImplementationOnce(async () => {
        return { ...mockTherapySessionEntity, cancelledAt: new Date() };
      });
      const incrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'increment');
      const decrementSpy = jest.spyOn(mockedPartnerAccessRepository, 'decrement');

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING);

      expect(incrementSpy).not.toHaveBeenCalled();
      expect(decrementSpy).not.toHaveBeenCalled();
    });

    it('should send a Slack message with masked email and user id on UPDATED_BOOKING', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');

      await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
      });

      expect(slackSpy).toHaveBeenCalledWith(expect.stringContaining('Therapy booking updated'));
      const message = slackSpy.mock.calls.at(-1)[0] as string;
      // mockUserEntity.email = 'user@email.com' → masked = 'u**r@email.com'
      expect(message).toContain('u**r@email.com');
      // The user repo mock spreads the lookup arg over the entity, so the resolved
      // user.id matches the id we passed in (user_id from the webhook payload).
      expect(message).toContain(`(id: ${mockSimplybookBodyBase.user_id})`);
    });

    it('should send a Slack message with the cancelled header on CANCELLED_BOOKING', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');

      await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        action: SIMPLYBOOK_ACTION_ENUM.CANCELLED_BOOKING,
      });

      // Last call is the notifier (any earlier Slack calls are operational alerts).
      const message = slackSpy.mock.calls.at(-1)[0] as string;
      expect(message).toContain('Therapy booking cancelled');
    });

    it('should send a Slack message with the new-booking header on NEW_BOOKING', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');
      jest.spyOn(mockedPartnerAccessRepository, 'find').mockImplementationOnce(async () => {
        return [
          { ...mockPartnerAccessEntity, therapySessionsRemaining: 6, therapySessionsRedeemed: 0 },
        ];
      });

      await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        action: SIMPLYBOOK_ACTION_ENUM.NEW_BOOKING,
      });

      const message = slackSpy.mock.calls.at(-1)[0] as string;
      expect(message).toContain('New therapy booking');
    });

    it('should include "Rescheduled from" line on UPDATED_BOOKING', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');

      await service.updatePartnerAccessTherapy({
        ...mockSimplybookBodyBase,
        action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
      });

      const message = slackSpy.mock.calls.at(-1)[0] as string;
      expect(message).toContain('Rescheduled from:');
    });

    it('should still resolve when the Slack notifier call throws', async () => {
      jest
        .spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel')
        .mockRejectedValueOnce(new Error('slack 500'));

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);
    });

    it('should still resolve and still send a Slack message when the notifier partner-access lookup fails', async () => {
      const slackSpy = jest.spyOn(mockedSlackMessageClient, 'sendMessageToTherapySlackChannel');
      // First find call (line ~151) succeeds, second (notifier aggregation) throws.
      jest
        .spyOn(mockedPartnerAccessRepository, 'find')
        .mockResolvedValueOnce([{ ...mockPartnerAccessEntity }] as PartnerAccessEntity[])
        .mockRejectedValueOnce(new Error('db connection lost'));

      await expect(
        service.updatePartnerAccessTherapy({
          ...mockSimplybookBodyBase,
          action: SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING,
        }),
      ).resolves.toHaveProperty('action', SIMPLYBOOK_ACTION_ENUM.UPDATED_BOOKING);

      // Notifier still sends a message — just without the aggregated counter lines.
      const message = slackSpy.mock.calls.at(-1)[0] as string;
      expect(message).toContain('Therapy booking updated');
      expect(message).not.toContain('Sessions remaining');
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

    it('should reject with UNAUTHORIZED when webhook_timestamp is outside the replay window', async () => {
      // 10 minutes ago — well outside the 5-minute window
      const staleTimestampSeconds = Math.floor(Date.now() / 1000) - 10 * 60;

      await expect(
        service.handleSimplybookWebhook({
          ...mockSimplybookWebhookDto,
          webhook_timestamp: staleTimestampSeconds,
        }),
      ).rejects.toMatchObject({
        status: 401,
        message: expect.stringContaining('replay window'),
      });
      expect(getBookingDetailsSpy).not.toHaveBeenCalled();
    });

    it('should accept when webhook_timestamp is inside the replay window', async () => {
      const freshTimestampSeconds = Math.floor(Date.now() / 1000);

      await service.handleSimplybookWebhook({
        ...mockSimplybookWebhookDto,
        webhook_timestamp: freshTimestampSeconds,
      });
      expect(getBookingDetailsSpy).toHaveBeenCalled();
    });
  });
});
