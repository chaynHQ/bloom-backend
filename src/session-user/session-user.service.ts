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
import { CourseUserService } from '../course-user/course-user.service';
import { CourseService } from '../course/course.service';
import { CreateSessionUserDto } from './dtos/create-session-user.dto';
import { SessionUserDto } from './dtos/session-user.dto';
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
  ): Promise<boolean> {
    const userSessionIds = courseUser.sessionUser.map((session) => {
      if (session.completed) return session.id;
    });

    const courseSessionIds = course.session.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const courseIsComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (courseIsComplete) {
      await this.courseUserService.completeCourse({
        userId: courseUser.userId,
        courseId: courseUser.course.id,
      });
    }

    return courseIsComplete;
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
    { sessionId }: CreateSessionUserDto,
  ): Promise<SessionUserEntity> {
    const { user } = await this.userService.getUser(firebaseUser);
    const { courseId } = await this.sessionService.getSession(sessionId);

    const courseSessions = await this.courseService.getCourseWithSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }

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
      sessionId,
      courseUserId: courseUser.id,
    });

    if (!sessionUser) {
      sessionUser = await this.createSessionUserRecord({
        sessionId,
        courseUserId: courseUser.id,
        completed: false,
      });
    }

    return sessionUser;
  }

  public async completeSessionUser(firebaseUser: IFirebaseUser, sessionId: string) {
    const { user } = await this.userService.getUser(firebaseUser);

    const session = await this.sessionService.getSession(sessionId);

    const { courseId } = session;

    let courseUser = await this.courseUserService.getCourseUser({
      userId: user.id,
      courseId,
    });

    if (!courseUser) {
      const courseUserRecord = await this.courseUserService.createCourseUser({
        userId: user.id,
        courseId,
      });

      courseUserRecord.sessionUser = [];

      courseUser = courseUserRecord;
    }

    let sessionUser = await this.getSessionUser({
      sessionId,
      courseUserId: courseUser.id,
    });

    const sessionUserExists = !!sessionUser;

    if (sessionUserExists) {
      courseUser.sessionUser.map((su) => {
        if (su.sessionId === sessionId) {
          su.completed = true;
        }
      });
    } else {
      sessionUser = await this.createSessionUserRecord({
        sessionId,
        courseUserId: courseUser.id,
        completed: true,
      });

      sessionUser.session = [session];
    }

    const courseWithSessions = await this.courseService.getCourseWithSessions(courseId);

    const courseComplete = sessionUserExists
      ? await this.checkCourseComplete(courseUser, courseWithSessions)
      : false;

    return {
      courseComplete,
      session,
    };
  }
}
