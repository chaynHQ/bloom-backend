import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { SessionService } from 'src/session/session.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserService } from 'src/user/user.service';
import { SessionFeedbackController } from './session-feedback.controller';
import { SessionFeedbackService } from './session-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionFeedbackEntity,
      SessionEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SubscriptionUserEntity,
      SubscriptionEntity,
      TherapySessionEntity,
    ]),
  ],
  controllers: [SessionFeedbackController],
  providers: [
    SessionFeedbackService,
    SessionService,
    UserService,
    SubscriptionUserService,
    SubscriptionService,
    PartnerAccessService,
    TherapySessionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
})
export class SessionFeedbackModule {}
