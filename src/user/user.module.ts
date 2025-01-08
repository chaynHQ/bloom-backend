import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PartnerEntity,
      SubscriptionEntity,
      SubscriptionUserEntity,
      PartnerAccessEntity,
      PartnerAdminEntity,
      TherapySessionEntity,
      EventLogEntity,
      ResourceUserEntity,
    ]),
    FirebaseModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    PartnerAccessService,
    ServiceUserProfilesService,
    SubscriptionService,
    SubscriptionUserService,
    TherapySessionService,
    CrispService,
    EventLoggerService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class UserModule {}
