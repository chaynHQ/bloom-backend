import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserService } from 'src/user/user.service';
import { EventLoggerController } from './event-logger.controller';
import { EventLoggerService } from './event-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventLogEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
    ]),
  ],
  controllers: [EventLoggerController],
  providers: [
    EventLoggerService,
    UserService,
    SubscriptionUserService,
    TherapySessionService,
    PartnerAccessService,
    SubscriptionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class EventLoggerModule {}
