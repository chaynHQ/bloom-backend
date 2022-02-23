import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from 'src/course-user/course-user.repository';
import { CourseUserService } from 'src/course-user/course-user.service';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerRepository } from '../partner/partner.repository';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerAccessRepository,
      UserRepository,
      PartnerRepository,
      CourseUserRepository,
    ]),
    FirebaseModule,
  ],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService, AuthService, UserService, CourseUserService],
})
export class PartnerAccessModule {}
