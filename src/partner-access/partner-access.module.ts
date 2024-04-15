import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserService } from '../user/user.service';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PartnerEntity,
      PartnerAccessEntity,
      PartnerAdminEntity,
      CourseUserEntity,
    ]),
    FirebaseModule,
  ],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService, AuthService, UserService, CourseUserService, PartnerService],
})
export class PartnerAccessModule {}
