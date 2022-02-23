import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from '../course-user/course-user.repository';
import { CourseUserService } from '../course-user/course-user.service';
import { CourseRepository } from '../course/course.repository';
import { CourseService } from '../course/course.service';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { SessionRepository } from '../session/session.repository';
import { SessionService } from '../session/session.service';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { SessionUserController } from './session-user.controller';
import { SessionUserRepository } from './session-user.repository';
import { SessionUserService } from './session-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionUserRepository,
      CourseUserRepository,
      UserRepository,
      PartnerRepository,
      SessionRepository,
      PartnerAccessRepository,
      CourseRepository,
    ]),
  ],
  controllers: [SessionUserController],
  providers: [
    SessionUserService,
    CourseUserService,
    UserService,
    SessionService,
    PartnerAccessService,
    CourseService,
  ],
})
export class SessionUserModule {}
