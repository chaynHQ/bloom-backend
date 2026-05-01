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
import { FrontChatService } from 'src/front-chat/front-chat.service';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserService } from 'src/user/user.service';
import { CrispExportService } from './crisp-export.service';
import { CrispMigrationController } from './crisp-migration.controller';
import { CrispMigrationService } from './crisp-migration.service';
import { FrontImportService } from './front-import.service';

@Module({
  imports: [
    AuthModule,
    FirebaseModule,
    TypeOrmModule.forFeature([
      ChatUserEntity,
      UserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      TherapySessionEntity,
      SubscriptionUserEntity,
      SubscriptionEntity,
    ]),
  ],
  providers: [
    CrispExportService,
    CrispMigrationService,
    FrontChatService,
    FrontImportService,
    UserService,
    PartnerAccessService,
    TherapySessionService,
    SubscriptionService,
    SubscriptionUserService,
    ServiceUserProfilesService,
    SlackMessageClient,
    ZapierWebhookClient,
  ],
  controllers: [CrispMigrationController],
})
export class CrispMigrationModule {}
