import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CrispService } from 'src/crisp/crisp.service';
import { CoursePartnerEntity } from 'src/entities/course-partner.entity';
import { CourseEntity } from 'src/entities/course.entity';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { SessionEntity } from 'src/entities/session.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerService } from 'src/partner/partner.service';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerAccessEntity,
      UserEntity,
      CourseEntity,
      SessionEntity,
      CoursePartnerEntity,
      PartnerEntity,
      TherapySessionEntity,
      PartnerAdminEntity,
      EventLogEntity,
    ]),
  ],
  providers: [
    WebhooksService,
    CoursePartnerService,
    PartnerService,
    ServiceUserProfilesService,
    SlackMessageClient,
    CrispService,
    EventLoggerService,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
