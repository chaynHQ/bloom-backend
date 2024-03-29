import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserRepository } from 'src/course-user/course-user.repository';
import { CourseUserService } from 'src/course-user/course-user.service';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerService } from 'src/partner/partner.service';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { FIREBASE, firebaseFactory } from './firebase-factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      PartnerRepository,
      PartnerAccessRepository,
      CourseUserRepository,
      PartnerAdminRepository,
    ]),
  ],
  providers: [
    firebaseFactory,
    UserService,
    PartnerAccessService,
    CourseUserService,
    PartnerService,
  ],
  exports: [FIREBASE],
})
export class FirebaseModule {}
