import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SessionService } from 'src/session/session.service';
import { mockCourse, mockSession, mockUserEntity } from 'test/utils/mockData';
import { Repository } from 'typeorm';
import { SessionUserService } from './session-user.service';

const courseUser = (completed: boolean): CourseUserEntity => ({
  id: 'cu1',
  completed,
  completedAt: completed ? new Date() : null,
  userId: mockUserEntity.id,
  user: null,
  courseId: mockCourse.id,
  course: mockCourse,
  sessionUser: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('SessionUserService course flags', () => {
  let service: SessionUserService;
  let courseUserService: CourseUserService;
  let sessionUserRepository: Repository<SessionUserEntity>;
  let courseRepository: Repository<CourseEntity>;

  beforeEach(async () => {
    sessionUserRepository = createMock<Repository<SessionUserEntity>>();
    courseRepository = createMock<Repository<CourseEntity>>();
    courseUserService = createMock<CourseUserService>();
    const sessionService = createMock<SessionService>({
      getSessionByStoryblokUuid: jest.fn().mockResolvedValue(mockSession),
    });

    (sessionUserRepository.createQueryBuilder as jest.Mock).mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    (sessionUserRepository.save as jest.Mock).mockImplementation(async (row) => ({
      ...row,
      id: 'su1',
    }));
    (courseRepository.findOne as jest.Mock).mockResolvedValue({
      ...mockCourse,
      session: [mockSession],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionUserService,
        { provide: getRepositoryToken(SessionUserEntity), useValue: sessionUserRepository },
        { provide: getRepositoryToken(CourseEntity), useValue: courseRepository },
        { provide: CourseUserService, useValue: courseUserService },
        { provide: SessionService, useValue: sessionService },
        { provide: ServiceUserProfilesService, useValue: createMock<ServiceUserProfilesService>() },
      ],
    }).compile();

    service = module.get(SessionUserService);
  });

  it('createSessionUser reports courseStarted when it creates the course_user', async () => {
    (courseUserService.getCourseUser as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(courseUser(false));
    (courseUserService.createCourseUser as jest.Mock).mockResolvedValue(courseUser(false));

    const response = await service.createSessionUser(mockUserEntity, {
      storyblokUuid: mockSession.storyblokUuid,
    });

    expect(response).toMatchObject({ courseStarted: true, courseCompleted: false });
  });

  it('createSessionUser reports no change for a course already started', async () => {
    (courseUserService.getCourseUser as jest.Mock).mockResolvedValue(courseUser(false));

    const response = await service.createSessionUser(mockUserEntity, {
      storyblokUuid: mockSession.storyblokUuid,
    });

    expect(response).toMatchObject({ courseStarted: false, courseCompleted: false });
  });

  it('setSessionUserCompleted reports courseCompleted when the last session completes', async () => {
    (courseUserService.getCourseUser as jest.Mock).mockResolvedValue(courseUser(false));

    const response = await service.setSessionUserCompleted(
      mockUserEntity,
      { storyblokUuid: mockSession.storyblokUuid },
      true,
    );

    expect(response).toMatchObject({ courseStarted: false, courseCompleted: true });
  });

  it('setSessionUserCompleted reports no completion for a course already completed', async () => {
    (courseUserService.getCourseUser as jest.Mock).mockResolvedValue(courseUser(true));

    const response = await service.setSessionUserCompleted(
      mockUserEntity,
      { storyblokUuid: mockSession.storyblokUuid },
      true,
    );

    expect(response).toMatchObject({ courseCompleted: false });
  });
});
