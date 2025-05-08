import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { ZapierWebhookClient } from 'src/api/zapier/zapier-webhook-client';
import { CrispService } from 'src/crisp/crisp.service';
import { CourseEntity } from 'src/entities/course.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { ResourceEntity } from 'src/entities/resource.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { SubscriptionEntity } from 'src/entities/subscription.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { PartnerService } from 'src/partner/partner.service';
import { ResourceService } from 'src/resource/resource.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { SubscriptionUserService } from 'src/subscription-user/subscription-user.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TherapySessionService } from 'src/therapy-session/therapy-session.service';
import { UserService } from 'src/user/user.service';
import { ResourceUserController } from './resource-user.controller';
import { ResourceUserService } from './resource-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ResourceEntity,
      ResourceUserEntity,
      PartnerAccessEntity,
      PartnerEntity,
      SessionEntity,
      PartnerAccessEntity,
      CourseEntity,
      PartnerAdminEntity,
      SubscriptionUserEntity,
      TherapySessionEntity,
      SubscriptionEntity,
      EventLogEntity,
    ]),
  ],
  controllers: [ResourceUserController],
  providers: [
    ResourceService,
    ResourceUserService,
    UserService,
    PartnerAccessService,
    PartnerService,
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
export class ResourceUserModule {}
