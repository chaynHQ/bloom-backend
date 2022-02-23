import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserModule } from 'src/course-user/course-user.module';
import { CourseUserRepository } from 'src/course-user/course-user.repository';
import { CourseUserService } from 'src/course-user/course-user.service';
import { SessionUserModule } from 'src/session-user/session-user.module';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      PartnerAccessRepository,
      PartnerRepository,
      CourseUserRepository,
    ]),
    FirebaseModule,
    SessionUserModule,
    CourseUserModule,
  ],
  controllers: [UserController],
  providers: [UserService, AuthService, PartnerAccessService, CourseUserService],
})
export class UserModule {}
