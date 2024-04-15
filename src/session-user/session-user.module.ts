import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { CourseUserService } from '../course-user/course-user.service';
import { CourseService } from '../course/course.service';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { SessionService } from '../session/session.service';
import { UserService } from '../user/user.service';
import { SessionUserController } from './session-user.controller';
import { SessionUserService } from './session-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionUserEntity,
      CourseUserEntity,
      UserEntity,
      PartnerEntity,
      SessionEntity,
      PartnerAccessEntity,
      CourseEntity,
      PartnerAdminEntity,
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
    PartnerService,
  ],
})
export class SessionUserModule {}
