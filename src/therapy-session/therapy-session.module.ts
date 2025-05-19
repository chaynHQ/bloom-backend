import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserService } from 'src/user/user.service';
import { TherapySessionController } from './therapy-session.controller';
import { TherapySessionService } from './therapy-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TherapySessionEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SubscriptionUserEntity,
      EventLogEntity,
      SubscriptionEntity,
    ]),
  ],
  controllers: [TherapySessionController],
  providers: [
    TherapySessionService,
    UserService,
    PartnerAccessService,
    SubscriptionUserService,
    ServiceUserProfilesService,
    EventLoggerService,
    CrispService,
    SubscriptionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class TherapySessionModule {}
