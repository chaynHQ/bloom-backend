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
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      CourseUserEntity,
      PartnerAdminEntity,
    ]),
    FirebaseModule,
  ],
  controllers: [UserController],
  providers: [UserService, AuthService, PartnerAccessService, PartnerService, CourseUserService],
})
export class UserModule {}
