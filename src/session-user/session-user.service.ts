import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { CourseService } from 'src/course/course.service';
import { SessionEntity } from 'src/entities/session.entity';
import { SessionService } from 'src/session/session.service';
import { GetUserDto } from 'src/user/dtos/get-user.dto';
import { UserService } from 'src/user/user.service';
import { CourseUserService } from '../course-user/course-user.service';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
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
      return session.id;
    });

    const courseSessionIds = courseSession.map((session) => {
      return session.id;
    });

    return _.xor(courseSessionIds, userSessionIds).length == 0;
  }

  public async createSessionUser(
    firebaseUser: IFirebaseUser,
    { sessionId }: CreateSessionUserDto,
  ): Promise<GetUserDto> {
    const { courseId } = await this.sessionService.getCourseFromSessionId(sessionId);

    const courseSessions = await this.courseService.getCourseSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const { id } = await this.userService.getUserFromFirebaseUid(firebaseUser);

    let courseUser = await this.courseUserService.courseUserExists({ userId: id, courseId });

    if (!courseUser) {
      courseUser = await this.courseUserService.createCourseUser({ userId: id, courseId });
    }

    const createSessionUserObject = this.sessionUserRepository.create({
      sessionId,
      courseUserId: courseUser.id,
      completed: true,
    });

    const exists = await this.sessionUserRepository.findOne({
      courseUserId: courseUser.id,
      sessionId,
    });

    if (!exists) {
      await this.sessionUserRepository.save(createSessionUserObject);
    }

    const userObject = await this.userService.getUser(firebaseUser);

    const markCourseComplete = this.markCourseComplete(userObject, courseSessions.session);
    if (markCourseComplete) {
      await this.courseUserService.updateCourseUser({ userId: id, courseId });
      userObject.course[0].completed = true;
    }

    return userObject;
  }
}
