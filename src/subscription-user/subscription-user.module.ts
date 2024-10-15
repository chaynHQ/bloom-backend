import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserService } from '../user/user.service';
import { SubscriptionUserController } from './subscription-user.controller';
import { SubscriptionUserService } from './subscription-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionUserEntity,
      SubscriptionEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      PartnerAdminEntity,
      TherapySessionEntity,
      EventLogEntity,
    ]),
    FirebaseModule,
  ],
  controllers: [SubscriptionUserController],
  providers: [
    SubscriptionUserService,
    SubscriptionService,
    UserService,
    PartnerAccessService,
    ServiceUserProfilesService,
    ZapierWebhookClient,
    CrispService,
    EventLoggerService,
    PartnerService,
    TherapySessionService,
    SlackMessageClient,
  ],
  exports: [SubscriptionUserService],
})
export class SubscriptionUserModule {}
