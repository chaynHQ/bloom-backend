import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { updateCrispProfileCourse, updateCrispProfileSession } from 'src/api/crisp/crisp-api';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { SessionService } from 'src/session/session.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { PROGRESS_STATUS, STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
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
  ): Promise<boolean> {
    const userSessionIds = courseUser.sessionUser.map((sessionUser) => {
      if (sessionUser.completed) return sessionUser.sessionId;
    });

    const courseSessionIds = course.session.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const courseIsComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (courseIsComplete) {
      await this.courseUserService.completeCourse({
        userId: courseUser.userId,
        courseId: courseUser.courseId,
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
    { storyblokId }: UpdateSessionUserDto,
  ): Promise<SessionUserEntity> {
    const { user, partnerAccesses } = await this.userService.getUser(firebaseUser);
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

      updateCrispProfileCourse(
        partnerAccesses,
        session.course.name,
        user.email,
        PROGRESS_STATUS.STARTED,
      );
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

      updateCrispProfileSession(
        session.course.name,
        session.name,
        PROGRESS_STATUS.STARTED,
        user.email,
      );
    }

    return sessionUser;
  }

  public async completeSessionUser(
    firebaseUser: IFirebaseUser,
    { storyblokId }: UpdateSessionUserDto,
  ) {
    const { user, partnerAccesses } = await this.userService.getUser(firebaseUser);
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

      updateCrispProfileCourse(
        partnerAccesses,
        session.course.name,
        user.email,
        PROGRESS_STATUS.STARTED,
      );

      courseUser.sessionUser = [];
    }

    let sessionUser = await this.getSessionUser({
      sessionId: id,
      courseUserId: courseUser.id,
    });

    if (sessionUser) {
      sessionUser.completed = true;
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

    const course = await this.courseService.getCourseWithSessions(courseId);
    const courseComplete = await this.checkCourseComplete(courseUser, course);

    if (courseComplete) {
      updateCrispProfileCourse(
        partnerAccesses,
        session.course.name,
        user.email,
        PROGRESS_STATUS.COMPLETED,
      );
    }

    updateCrispProfileSession(
      session.course.name,
      session.name,
      PROGRESS_STATUS.COMPLETED,
      user.email,
    );

    return {
      courseComplete,
      sessionUser,
    };
  }
}
