import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from 'src/course-user/course-user.repository';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseRepository } from 'src/course/course.repository';
import { CourseService } from 'src/course/course.service';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { PartnerRepository } from 'src/partner/partner.repository';
import { SessionRepository } from 'src/session/session.repository';
import { SessionService } from 'src/session/session.service';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
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
