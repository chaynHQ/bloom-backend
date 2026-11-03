import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { ResourceService } from 'src/resource/resource.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { mockCourse, mockResource, mockUserEntity } from 'test/utils/mockData';
import { Repository } from 'typeorm';
import { ResourceUserService } from './resource-user.service';

const mockCourseResource = (n: number): ResourceEntity => ({
  ...mockResource,
  id: `resourceId${n}`,
  storyblokUuid: `courseResourceUuid${n}`,
});

const modularCourse: CourseEntity = {
  ...mockCourse,
  id: 'modularCourseId',
  storyblokUuid: 'modularCourseUuid',
  name: 'Healing basics',
  resources: [mockCourseResource(1), mockCourseResource(2)],
};

const openCourseUser = (course: CourseEntity): CourseUserEntity => ({
  id: `courseUser-${course.id}`,
  completed: false,
  completedAt: null,
  userId: mockUserEntity.id,
  user: null,
  courseId: course.id,
  course,
  sessionUser: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ResourceUserService', () => {
  let service: ResourceUserService;
  let resourceUserRepository: Repository<ResourceUserEntity>;
  let resourceRepository: Repository<ResourceEntity>;
  let courseRepository: Repository<CourseEntity>;
  let courseUserRepository: Repository<CourseUserEntity>;
  let resourceService: ResourceService;
  let courseUserService: CourseUserService;
  let serviceUserProfilesService: ServiceUserProfilesService;

  // The resource being started or completed, the course's published resources, and which are completed.
  // The repositories stand in for the database's filtering by course and status.
  const setup = ({
    resource = mockCourseResource(1),
    publishedResources = [mockCourseResource(1), mockCourseResource(2)],
    completedIds = [] as string[],
    courseUsers = [] as CourseUserEntity[],
    contextCourse = modularCourse as CourseEntity | null,
    existingResourceUser = null as ResourceUserEntity | null,
  } = {}) => {
    (resourceService.getResourceByStoryblokUuid as jest.Mock).mockResolvedValue(resource);
    (resourceUserRepository.createQueryBuilder as jest.Mock).mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(existingResourceUser),
    });
    (resourceUserRepository.save as jest.Mock).mockImplementation(async (row) => ({
      id: 'resourceUserId',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...row,
    }));
    (resourceRepository.find as jest.Mock).mockResolvedValue(publishedResources);
    (resourceUserRepository.find as jest.Mock).mockResolvedValue(
      completedIds.map((resourceId) => ({ resourceId })),
    );
    (courseRepository.findOneBy as jest.Mock).mockResolvedValue(contextCourse);
    (courseUserRepository.find as jest.Mock).mockResolvedValue(courseUsers);
  };

  beforeEach(async () => {
    resourceUserRepository = createMock<Repository<ResourceUserEntity>>();
    resourceRepository = createMock<Repository<ResourceEntity>>();
    courseRepository = createMock<Repository<CourseEntity>>();
    courseUserRepository = createMock<Repository<CourseUserEntity>>();
    resourceService = createMock<ResourceService>();
    courseUserService = createMock<CourseUserService>({
      createCourseUserIfMissing: jest.fn().mockResolvedValue(true),
      setCourseUserCompletedIfIncomplete: jest.fn().mockResolvedValue(true),
      getCourseUser: jest.fn().mockResolvedValue(openCourseUser(modularCourse)),
    });
    serviceUserProfilesService = createMock<ServiceUserProfilesService>({
      updateServiceUserProfilesCourse: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceUserService,
        { provide: getRepositoryToken(ResourceUserEntity), useValue: resourceUserRepository },
        { provide: getRepositoryToken(ResourceEntity), useValue: resourceRepository },
        { provide: getRepositoryToken(CourseEntity), useValue: courseRepository },
        { provide: getRepositoryToken(CourseUserEntity), useValue: courseUserRepository },
        { provide: ResourceService, useValue: resourceService },
        { provide: CourseUserService, useValue: courseUserService },
        { provide: ServiceUserProfilesService, useValue: serviceUserProfilesService },
      ],
    }).compile();

    service = module.get(ResourceUserService);
  });

  describe('setResourceUserCompleted', () => {
    it('saves completedAt when completing a resource that was never started', async () => {
      setup();

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(resourceUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
      expect(response.completed).toBe(true);
    });

    it('completes a started course once every published resource is done', async () => {
      setup({
        completedIds: ['resourceId1', 'resourceId2'],
        courseUsers: [openCourseUser(modularCourse)],
      });

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(courseUserRepository.find).toHaveBeenCalledWith({
        where: {
          userId: mockUserEntity.id,
          completed: false,
          course: { resources: { id: 'resourceId1' } },
        },
        relations: { course: true },
      });
      expect(resourceRepository.find).toHaveBeenCalledWith({
        select: { id: true },
        where: {
          courses: { id: 'modularCourseId' },
          status: STORYBLOK_STORY_STATUS_ENUM.PUBLISHED,
        },
      });
      expect(courseUserService.setCourseUserCompletedIfIncomplete).toHaveBeenCalledWith(
        'courseUser-modularCourseId',
      );
      expect(response.courseProgress).toEqual([
        {
          storyblokUuid: 'modularCourseUuid',
          name: 'Healing basics',
          started: false,
          completed: true,
        },
      ]);
      await new Promise(process.nextTick);
      expect(courseUserService.getCourseUser).toHaveBeenCalledWith({
        userId: mockUserEntity.id,
        courseId: 'modularCourseId',
      });
      expect(serviceUserProfilesService.updateServiceUserProfilesCourse).toHaveBeenCalled();
    });

    it('does not complete a course while a resource is outstanding', async () => {
      setup({ completedIds: ['resourceId1'], courseUsers: [openCourseUser(modularCourse)] });

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(courseUserService.setCourseUserCompletedIfIncomplete).not.toHaveBeenCalled();
      expect(response.courseProgress).toBeUndefined();
    });

    it('tolerates duplicate resource_user rows', async () => {
      setup({
        completedIds: ['resourceId1', 'resourceId1', 'resourceId2'],
        courseUsers: [openCourseUser(modularCourse)],
      });

      await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(courseUserService.setCourseUserCompletedIfIncomplete).toHaveBeenCalled();
    });

    it('reports no change when another request already completed the course', async () => {
      setup({
        completedIds: ['resourceId1', 'resourceId2'],
        courseUsers: [openCourseUser(modularCourse)],
      });
      (courseUserService.setCourseUserCompletedIfIncomplete as jest.Mock).mockResolvedValue(false);

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(response.courseProgress).toBeUndefined();
      expect(courseUserService.getCourseUser).not.toHaveBeenCalled();
    });

    it('never completes a course with no published resources', async () => {
      setup({ publishedResources: [], courseUsers: [openCourseUser(modularCourse)] });

      await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(courseUserService.setCourseUserCompletedIfIncomplete).not.toHaveBeenCalled();
    });

    it('never touches courses when marking a resource incomplete', async () => {
      setup({ existingResourceUser: { id: 'ru1', completedAt: new Date() } as ResourceUserEntity });

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1', courseStoryblokUuid: 'modularCourseUuid' },
        false,
      );

      expect(courseUserRepository.find).not.toHaveBeenCalled();
      expect(courseUserService.createCourseUserIfMissing).not.toHaveBeenCalled();
      expect(response.completed).toBe(false);
    });

    it('still returns the resource when course logic fails', async () => {
      setup();
      (courseUserRepository.find as jest.Mock).mockRejectedValue(new Error('db down'));

      const response = await service.setResourceUserCompleted(
        mockUserEntity,
        { storyblokUuid: 'courseResourceUuid1' },
        true,
      );

      expect(response.completed).toBe(true);
      expect(response.courseProgress).toBeUndefined();
    });
  });

  describe('createResourceUser', () => {
    it('starts the context course when it lists the resource', async () => {
      setup();

      const response = await service.createResourceUser(mockUserEntity, {
        storyblokUuid: 'courseResourceUuid1',
        courseStoryblokUuid: 'modularCourseUuid',
      });

      expect(courseRepository.findOneBy).toHaveBeenCalledWith({
        storyblokUuid: 'modularCourseUuid',
        resources: { id: 'resourceId1' },
      });
      expect(courseUserService.createCourseUserIfMissing).toHaveBeenCalledWith({
        userId: mockUserEntity.id,
        courseId: 'modularCourseId',
      });
      expect(response.courseProgress).toEqual([
        {
          storyblokUuid: 'modularCourseUuid',
          name: 'Healing basics',
          started: true,
          completed: false,
        },
      ]);
    });

    it('reports no change when the course was already started', async () => {
      setup();
      (courseUserService.createCourseUserIfMissing as jest.Mock).mockResolvedValue(false);

      const response = await service.createResourceUser(mockUserEntity, {
        storyblokUuid: 'courseResourceUuid1',
        courseStoryblokUuid: 'modularCourseUuid',
      });

      expect(response.courseProgress).toBeUndefined();
    });

    it('does not start a course that does not list the resource', async () => {
      setup({ contextCourse: null });

      const response = await service.createResourceUser(mockUserEntity, {
        storyblokUuid: 'courseResourceUuid1',
        courseStoryblokUuid: mockCourse.storyblokUuid,
      });

      expect(courseUserService.createCourseUserIfMissing).not.toHaveBeenCalled();
      expect(response.courseProgress).toBeUndefined();
    });

    it('starts and completes a course whose resources were all done elsewhere', async () => {
      setup({
        completedIds: ['resourceId1', 'resourceId2'],
        courseUsers: [openCourseUser(modularCourse)],
      });

      const response = await service.createResourceUser(mockUserEntity, {
        storyblokUuid: 'courseResourceUuid1',
        courseStoryblokUuid: 'modularCourseUuid',
      });

      expect(response.courseProgress).toEqual([
        {
          storyblokUuid: 'modularCourseUuid',
          name: 'Healing basics',
          started: true,
          completed: true,
        },
      ]);
    });

    it('has no course side effects without a course', async () => {
      setup();

      await service.createResourceUser(mockUserEntity, { storyblokUuid: 'courseResourceUuid1' });

      expect(courseRepository.findOneBy).not.toHaveBeenCalled();
      expect(courseUserRepository.find).not.toHaveBeenCalled();
    });
  });
});
