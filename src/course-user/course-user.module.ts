import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { UserService } from '../user/user.service';
import { CourseUserService } from './course-user.service';
import { CoursesUserController } from './courses-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseUserEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
      EventLogEntity,
    ]),
    FirebaseModule
  ],
  controllers: [CoursesUserController],
  providers: [
    AuthService,
    UserService,
    CourseUserService,
    SubscriptionUserService,
    TherapySessionService,
    PartnerAccessService,
    ServiceUserProfilesService,
    CrispService,
    SubscriptionService,
    ZapierWebhookClient,
    SlackMessageClient,
    EventLoggerService],
})
export class CourseUserModule {}
