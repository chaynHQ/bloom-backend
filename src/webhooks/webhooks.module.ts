import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailchimpClient } from 'src/api/mailchimp/mailchip-api';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { CoursePartnerRepository } from 'src/course-partner/course-partner.repository';
import { CoursePartnerService } from 'src/course-partner/course-partner.service';
import { CourseRepository } from 'src/course/course.repository';
import { EventLoggerRepository } from 'src/event-logger/event-logger.repository';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { SessionRepository } from 'src/session/session.repository';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { UserRepository } from '../user/user.repository';
import { EmailCampaignRepository } from './email-campaign/email-campaign.repository';
import { TherapySessionRepository } from './therapy-session.repository';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerAccessRepository,
      UserRepository,
      CourseRepository,
      SessionRepository,
      CoursePartnerRepository,
      PartnerRepository,
      TherapySessionRepository,
      PartnerAdminRepository,
      EmailCampaignRepository,
      EventLoggerRepository,
    ]),
  ],
  providers: [
    WebhooksService,
    CoursePartnerService,
    PartnerService,
    MailchimpClient,
    SlackMessageClient,
    EventLoggerService,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
