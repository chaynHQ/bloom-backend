import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { AuthModule } from 'src/auth/auth.module';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { FrontChatController } from './front-chat.controller';
import { FrontChatGateway } from './front-chat.gateway';
import { FrontChatService } from './front-chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ChatUserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SubscriptionEntity,
      SubscriptionUserEntity,
      TherapySessionEntity,
    ]),
    AuthModule,
    FirebaseModule,
    UserModule,
  ],
  providers: [
    FrontChatService,
    FrontChatGateway,
    PartnerAccessService,
    UserService,
    ServiceUserProfilesService,
    SubscriptionUserService,
    SubscriptionService,
    TherapySessionService,
    ZapierWebhookClient,
    SlackMessageClient,
  ],
  controllers: [FrontChatController],
  exports: [FrontChatService, FrontChatGateway],
})
export class FrontChatModule {}
