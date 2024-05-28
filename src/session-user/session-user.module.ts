import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerService } from 'src/partner/partner.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
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
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
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
    SubscriptionUserService,
    TherapySessionService,
    SubscriptionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class SessionUserModule {}
