import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { SessionService } from 'src/session/session.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { formatCourseUserObjects } from 'src/utils/serialize';
import { CourseUserService } from '../course-user/course-user.service';
import { CourseService } from '../course/course.service';
import { SessionUserDto } from './dtos/session-user.dto';
import { UpdateSessionUserDto } from './dtos/update-session-user.dto';
import { SessionUserRepository } from './session-user.repository';
@Injectable()
export class SessionUserService {
  constructor(
    @InjectRepository(SessionUserRepository) private sessionUserRepository: SessionUserRepository,
    @InjectRepository(UserRepository) private userRepository: UserRepository,
    private readonly courseUserService: CourseUserService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly courseService: CourseService,
  ) {}

  private async checkCourseComplete(
    courseUser: CourseUserEntity,
    course: CourseEntity,
  ): Promise<CourseUserEntity> {
    const userSessionIds = courseUser.sessionUser.map((sessionUser) => {
      if (sessionUser.completed) return sessionUser.sessionId;
    });

    const courseSessionIds = course.session.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const courseIsComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (courseIsComplete) {
      const updatedCourseUser = await this.courseUserService.completeCourse({
        userId: courseUser.userId,
        courseId: courseUser.courseId,
      });
      return Object.assign({}, courseUser, updatedCourseUser);
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
  }: SessionUserDto): Promise<SessionUserEntity> {
    return await this.sessionUserRepository.save({
      sessionId,
      courseUserId,
      completed,
    });
  }

  public async createSessionUser(
    firebaseUser: IFirebaseUser,
    { storyblokId }: UpdateSessionUserDto,
  ) {
    const { user } = await this.userService.getUser(firebaseUser);
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

    // Attach data to object to be serialized for response
    const course = await this.courseService.getCourse(courseId);
    sessionUser.session = session;
    courseUser.sessionUser.push(sessionUser);
    courseUser.course = course;
    const formattedResponse = formatCourseUserObjects([courseUser])[0];
    return formattedResponse;
  }

  public async completeSessionUser(
    firebaseUser: IFirebaseUser,
    { storyblokId }: UpdateSessionUserDto,
  ) {
    const { user } = await this.userService.getUser(firebaseUser);
    const session = await this.sessionService.getSessionByStoryblokId(storyblokId);

    if (!session) {
      throw new HttpException('SESSION NOT FOUND', HttpStatus.NOT_FOUND);
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

      courseUser.sessionUser = [];
    }

    let sessionUser = await this.getSessionUser({
      sessionId: id,
      courseUserId: courseUser.id,
    });

    if (sessionUser) {
      sessionUser.completed = true;
      sessionUser.completedAt = new Date();
      await this.sessionUserRepository.save(sessionUser);

      courseUser.sessionUser.map((su) => {
        if (su.sessionId === id) {
          su.completed = true;
        }
      });
    } else {
      sessionUser = await this.createSessionUserRecord({
        sessionId: id,
        courseUserId: courseUser.id,
        completed: true,
      });
      sessionUser.session = session;
      courseUser.sessionUser.push(sessionUser);
    }

    // Attach data to object to be serialized for response
    const course = await this.courseService.getCourseWithSessions(courseId);
    courseUser = await this.checkCourseComplete(courseUser, course);
    courseUser.course = course;
    const formattedResponse = formatCourseUserObjects([courseUser])[0];

    return formattedResponse;
  }
}
