import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CourseUserService } from 'src/course-user/course-user.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
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
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
    ]),
    FirebaseModule,
  ],
  controllers: [PartnerAccessController],
  providers: [
    PartnerAccessService,
    AuthService,
    UserService,
    CourseUserService,
    PartnerService,
    ServiceUserProfilesService,
    SubscriptionUserService,
    SubscriptionService,
    TherapySessionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class PartnerAccessModule {}
