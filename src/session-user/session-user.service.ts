import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { SessionService } from 'src/session/session.service';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
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
    private readonly courseUserService: CourseUserService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly courseService: CourseService,
  ) {}

  private markCourseComplete(userCourse: GetUserDto, courseSession: SessionEntity[]): boolean {
    const userCompletedSession = userCourse.course[0].session;

    const userSessionIds = userCompletedSession.map((session) => {
      if (session.completed) return session.id;
    });

    const courseSessionIds = courseSession.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    return _.xor(courseSessionIds, userSessionIds).length == 0;
  }

  public async createSessionUser(
    user: UserEntity,
    { sessionId }: CreateSessionUserDto,
  ): Promise<SessionUserEntity> {
    const { courseId } = await this.sessionService.getCourseFromSessionId(sessionId);

    const courseSessions = await this.courseService.getCourseSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }

    let courseUser = await this.courseUserService.courseUserExists({ userId: user.id, courseId });

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser({ userId: user.id, courseId });
    }

    const createSessionUserObject = this.sessionUserRepository.create({
      sessionId,
      courseUserId: courseUser.id,
      completed: false,
    });

    let sessionUser = await this.sessionUserRepository.findOne({
      courseUserId: courseUser.id,
      sessionId,
    });

    if (!sessionUser) {
      sessionUser = await this.sessionUserRepository.save(createSessionUserObject);
    }

    return sessionUser;
  }

  public async updateSessionUser(user: UserEntity, sessionId: string) {
    const { courseId } = await this.sessionService.getCourseFromSessionId(sessionId);

    const courseSessions = await this.courseService.getCourseSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const courseUser = await this.courseUserService.courseUserExists({ userId: user.id, courseId });

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

    const markCourseComplete = this.markCourseComplete(userObject, courseSessions.session);
    if (markCourseComplete) {
      await this.courseUserService.updateCourseUser({ userId: user.id, courseId });
      userObject.course[0].completed = true;
    }

    return userObject;
  }
}
