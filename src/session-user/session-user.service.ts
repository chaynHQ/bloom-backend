import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { UserEntity } from 'src/entities/user.entity';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { Repository } from 'typeorm';
import { CourseUserService } from '../course-user/course-user.service';
import { CourseUserEntity } from '../entities/course-user.entity';
import { CourseEntity } from '../entities/course.entity';
import { SessionUserEntity } from '../entities/session-user.entity';
import { Logger } from '../logger/logger';
import { SessionService } from '../session/session.service';
import { STORYBLOK_STORY_STATUS_ENUM } from '../utils/constants';
import { formatCourseUserObject, formatCourseUserObjects } from '../utils/serialize';
import { SessionUserDto } from './dtos/session-user.dto';
import { UpdateSessionUserDto } from './dtos/update-session-user.dto';

@Injectable()
export class SessionUserService {
  private readonly logger = new Logger('SessionUserService');

  constructor(
    @InjectRepository(SessionUserEntity)
    private sessionUserRepository: Repository<SessionUserEntity>,
    @InjectRepository(CourseEntity)
    private courseRepository: Repository<CourseEntity>,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private readonly courseUserService: CourseUserService,
    private readonly sessionService: SessionService,
    private serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  private async checkCourseIsComplete(
    courseUser: CourseUserEntity,
    course: CourseEntity,
  ): Promise<CourseUserEntity> {
    const userSessionIds = courseUser.sessionUser?.map((sessionUser) => {
      if (sessionUser.completed) return sessionUser.sessionId;
    });

    const courseSessionIds = course.session?.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const courseIsComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (courseUser.completed !== courseIsComplete) {
      await this.courseUserService.setCourseUserCompleted(
        {
          userId: courseUser.userId,
          courseId: courseUser.courseId,
        },
        courseIsComplete,
      );

      courseUser.completed = courseIsComplete;
    }

    return courseUser;
  }

  private async getSessionUser({
    courseUserId,
    sessionId,
  }: SessionUserDto): Promise<SessionUserEntity> {
    return await this.sessionUserRepository
      .createQueryBuilder('session_user')
      .leftJoinAndSelect('session_user.session', 'session')
      .where('session_user.courseUserId = :courseUserId', { courseUserId })
      .andWhere('session_user.sessionId = :sessionId', { sessionId })
      .getOne();
  }

  async createSessionUserRecord({
    sessionId,
    courseUserId,
    completed,
    completedAt,
  }: SessionUserDto): Promise<SessionUserEntity> {
    return await this.sessionUserRepository.save({
      sessionId,
      courseUserId,
      completed,
      completedAt,
    });
  }

  public async createSessionUser(user: UserEntity, { storyblokId }: UpdateSessionUserDto) {
    const session = await this.sessionService.getSessionByStoryblokId(storyblokId);

    if (!session) {
      throw new HttpException('SESSION NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const { id, courseId } = session;

    let courseUser: CourseUserEntity = await this.courseUserService.getCourseUser({
      userId: user.id,
      courseId,
    });

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser({
        userId: user.id,
        courseId,
      });
    }

    let sessionUser = await this.getSessionUser({
      sessionId: id,
      courseUserId: courseUser.id,
    });

    if (!sessionUser) {
      sessionUser = await this.createSessionUserRecord({
        sessionId: id,
        courseUserId: courseUser.id,
        completed: false,
      });
    }

    // Retrieve data for response
    const updatedCourseUser = await this.courseUserService.getCourseUser({
      userId: user.id,
      courseId,
    });

    this.serviceUserProfilesService.updateServiceUserProfilesCourse(updatedCourseUser, user.email);

    return formatCourseUserObject(updatedCourseUser);
  }

  public async setSessionUserCompleted(
    user : UserEntity,
    { storyblokId }: UpdateSessionUserDto,
    completed: boolean,
  ) {
    const session = await this.sessionService.getSessionByStoryblokId(storyblokId);

    if (!session) {
      throw new HttpException(
        `Session not found for storyblok id: ${storyblokId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const { id, courseId } = session;

    let courseUser = await this.courseUserService.getCourseUser({
      userId: user.id,
      courseId,
    });

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser({
        userId: user.id,
        courseId,
      });
      courseUser.sessionUser = []; // initialise session user array

      this.logger.error(
        `Course user not found for user (user-id: ${user.id}) for course (course-id: ${courseId}).
         Creating new course user so that session (session-id: ${session.id}) can be marked compelete`,
      );
    }

    let sessionUser = await this.getSessionUser({
      sessionId: id,
      courseUserId: courseUser.id,
    });

    if (sessionUser) {
      sessionUser.completed = completed;
      sessionUser.completedAt = completed ? new Date() : null;
      await this.sessionUserRepository.save(sessionUser);

      courseUser.sessionUser?.map((su) => {
        if (su.sessionId === id) {
          su.completed = completed;
        }
      });
    } else {
      sessionUser = await this.createSessionUserRecord({
        sessionId: id,
        courseUserId: courseUser.id,
        completed,
        completedAt: completed ? new Date() : null,
      });
      sessionUser.session = session;
      courseUser.sessionUser.push(sessionUser);
    }

    // Attach data to object to be serialized for response
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: { session: true },
    });
    courseUser = await this.checkCourseIsComplete(courseUser, course);
    courseUser.course = course;
    const formattedResponse = formatCourseUserObjects([courseUser])[0];

    this.serviceUserProfilesService.updateServiceUserProfilesCourse(courseUser, user.email);

    return formattedResponse;
  }
}
