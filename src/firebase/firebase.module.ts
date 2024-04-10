import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { UserService } from '../user/user.service';
import { FIREBASE, firebaseFactory } from './firebase-factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PartnerEntity,
      PartnerAccessEntity,
      CourseUserEntity,
      PartnerAdminEntity,
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
