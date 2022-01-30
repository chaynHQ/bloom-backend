import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { IFirebaseUser } from 'src/firebase/firebase-user.interface';
import { SessionService } from 'src/session/session.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { STORYBLOK_STORY_STATUS_ENUM } from 'src/utils/constants';
import { getManager } from 'typeorm';
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

  private async updateSessionUser(
    sessionId: string,
    courseUserId: string,
    complete: boolean,
  ): Promise<SessionUserEntity[]> {
    const onConflict = complete
      ? ` ON CONFLICT ON CONSTRAINT session_user_index_name DO UPDATE SET completed = ${Boolean(
          complete,
        )}`
      : ` ON CONFLICT DO NOTHING`;

    return await getManager().query(`WITH "session_user_alias" AS (
              INSERT INTO "session_user"("createdAt", "updatedAt", "sessionUserId", completed, "sessionId", "courseUserId")
              VALUES (DEFAULT, DEFAULT, DEFAULT, ${Boolean(
                complete,
              )}, '${sessionId}', '${courseUserId}')
             ${onConflict}
              RETURNING * )
                SELECT * FROM "session_user_alias" UNION SELECT * FROM "session_user"
                WHERE "sessionId"='${sessionId}' AND "courseUserId"='${courseUserId}'`);
  }

  private async checkCourseComplete(
    courseUserId: string,
    userId: string,
    courseId: string,
    sessionId: string,
  ) {
    const courseSession = await this.courseService.getCourseWithSessions(courseId);

    const userSessionIds = (
      await this.sessionUserRepository
        .createQueryBuilder('session_user')
        .select(['session_user.sessionUserId'])
        .where('session_user.courseUserId = :courseUserId', { courseUserId })
        .andWhere('session_user.sessionId = :sessionId', { sessionId })
        .andWhere('session_user.completed = true')
        .getRawMany()
    ).map((id) => {
      return id['sessionUserId'];
    });

    const courseSessionIds = courseSession.session.map((session) => {
      if (session.status === STORYBLOK_STORY_STATUS_ENUM.PUBLISHED) return session.id;
    });

    const courseIsComplete = _.xor(courseSessionIds, userSessionIds).length == 0;

    if (courseIsComplete) {
      await this.courseUserService.completeCourse({
        userId,
        courseId,
      });
    }

    return courseIsComplete;
  }

  public async createSessionUser(
    firebaseUser: IFirebaseUser,
    { sessionId }: CreateSessionUserDto,
  ): Promise<SessionUserEntity[]> {
    const {
      user: { id },
    } = await this.userService.getUser(firebaseUser);
    const { courseId } = await this.sessionService.getSession(sessionId);

    const courseSessions = await this.courseService.getCourseWithSessions(courseId);

    if (!courseSessions) {
      throw new HttpException('COURSE SESSIONS NOT FOUND', HttpStatus.NOT_FOUND);
    }
    const courseUser = await this.courseUserService.createCourseUser({ userId: id, courseId });

    return await this.updateSessionUser(sessionId, courseUser[0]['courseUserId'], false);
  }

  public async completeSessionUser(
    firebaseUser: IFirebaseUser,
    sessionId: string,
  ): Promise<{
    courseComplete: boolean;
    session: SessionEntity;
  }> {
    const {
      user: { id },
    } = await this.userService.getUser(firebaseUser);

    const session = await this.sessionService.getSession(sessionId);

    const { courseId } = session;

    const courseUser = await this.courseUserService.createCourseUser({
      userId: id,
      courseId,
    });

    await this.updateSessionUser(sessionId, courseUser[0]['courseUserId'], true);

    const courseComplete = await this.checkCourseComplete(
      courseUser[0]['courseUserId'],
      id,
      courseId,
      session.id,
    );

    return {
      courseComplete,
      session,
    };
  }
}
