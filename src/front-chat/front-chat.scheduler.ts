import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';
import { FrontChatService } from './front-chat.service';

@Injectable()
export class FrontChatScheduler {
  private readonly logger = new Logger('FrontChatScheduler');

  constructor(
    private readonly frontChatService: FrontChatService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUnreadMessages(): Promise<void> {
    const unread = await this.frontChatService.getUsersWithUnreadMessages();
    if (!unread.length) return;

    this.logger.log(`FrontChatScheduler: notifying ${unread.length} user(s) of unread messages`);

    await Promise.allSettled(
      unread.map(async ({ chatUser, email }) => {
        // Mark notified in the DB before sending so a restart between these two
        // operations doesn't cause a duplicate notification on the next cron fire.
        try {
          await this.frontChatService.markUnreadNotified(chatUser.id);
        } catch (err) {
          this.logger.warn(
            `FrontChatScheduler: failed to mark notified for ${email}, skipping send: ${(err as Error)?.message || 'unknown error'}`,
          );
          return;
        }
        // Recovery wrapper: recreates an archived/missing Mailchimp profile before retrying
        // the event so the unread-message email still fires.
        await this.serviceUserProfilesService.sendMailchimpUserEventWithRecovery(
          email,
          MAILCHIMP_CUSTOM_EVENTS.FRONT_MESSAGE_UNREAD,
        );
      }),
    );
  }
}
