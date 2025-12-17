import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { ResourceService } from 'src/resource/resource.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserService } from 'src/user/user.service';
import { ResourceFeedbackController } from './resource-feedback.controller';
import { ResourceFeedbackService } from './resource-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceFeedbackEntity,
      ResourceEntity,
      PartnerAccessEntity,
      UserEntity,
      PartnerEntity,
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
      EventLogEntity,
    ]),
  ],
  controllers: [ResourceFeedbackController],
  providers: [
    ResourceFeedbackService,
    ResourceService,
    UserService,
    SubscriptionUserService,
    TherapySessionService,
    PartnerAccessService,
    ServiceUserProfilesService,
    CrispService,
    SubscriptionUserService,
    SubscriptionService,
    ZapierWebhookClient,
    SlackMessageClient,
    EventLoggerService,
  ],
})
export class ResourceFeedbackModule {}
