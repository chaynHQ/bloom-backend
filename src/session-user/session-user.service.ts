import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { SessionService } from 'src/session/session.service';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { CourseUserService } from '../course-user/course-user.service';
import { CourseService } from '../course/course.service';
import { CreateSessionUserDto } from './dtos/create-session-user.dto';
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

  private async markCourseComplete(
    userCourse: GetUserDto,
    courseId: string,
    courseSession: SessionEntity[],
  ): Promise<boolean> {
    const userCompletedSession = userCourse.courses.find((course) => {
      return course.id === courseId;
    }).sessions;

    const userSessionIds = userCompletedSession.map((session) => {
      if (session.completed) return session.id;
    });

    const courseSessionIds = courseSession.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const markCourseComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (markCourseComplete) {
      await this.courseUserService.completeCourse({
        userId: userCourse.user.id,
        courseId,
      });
    }

    return markCourseComplete;
  }

  public async createSessionUser(
    { uid }: IFirebaseUser,
    { sessionId }: CreateSessionUserDto,
  ): Promise<SessionUserEntity> {
    const user = await this.userRepository.findOne({ firebaseUid: uid });

    const { courseId } = await this.sessionService.getSession(sessionId);

    const courseSessions = await this.courseService.getCourseSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }

    let courseUser = await this.courseUserService.getCourseUser({ userId: user.id, courseId });

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser({ userId: user.id, courseId });
    }

    let sessionUser = await this.sessionUserRepository.findOne({
      courseUserId: courseUser.id,
      sessionId,
    });

    if (!sessionUser) {
      sessionUser = await this.sessionUserRepository.save({
        sessionId,
        courseUserId: courseUser.id,
        completed: false,
      });
    }

    return sessionUser;
  }

  public async completeSessionUser({ uid }: IFirebaseUser, sessionId: string) {
    const user = await this.userRepository.findOne({ firebaseUid: uid });

    const session = await this.sessionService.getSession(sessionId);

    const { courseId } = session;

    const courseSessions = await this.courseService.getCourseSessions(courseId);

    const courseUser = await this.courseUserService.getCourseUser({ userId: user.id, courseId });

    if (!courseUser) {
      throw new HttpException('COURSE USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const sessionUser = await this.sessionUserRepository.findOne({
      where: { courseUserId: courseUser.id, sessionId },
    });

    if (!sessionUser) {
      throw new HttpException('SESSION USER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    sessionUser.completed = true;

    await this.sessionUserRepository.save(sessionUser);

    const userObject = await this.userService.getUser(user);
    const courseComplete = await this.markCourseComplete(
      userObject,
      courseId,
      courseSessions.session,
    );

    return {
      courseComplete,
      session,
    };
  }
}
