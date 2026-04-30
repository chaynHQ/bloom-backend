import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sendMailchimpUserEvent } from 'src/api/mailchimp/mailchimp-api';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { Logger } from 'src/logger/logger';
import { FrontChatService } from './front-chat.service';

@Injectable()
export class FrontChatScheduler {
  private readonly logger = new Logger('FrontChatScheduler');

  constructor(private readonly frontChatService: FrontChatService) {}

  // Every minute: find users with unread messages older than 5 minutes and send a Mailchimp event.
  @Cron('* * * * *')
  async checkUnreadMessages(): Promise<void> {
    const unread = await this.frontChatService.getUsersWithUnreadMessages();
    if (!unread.length) return;

    this.logger.log(`FrontChatScheduler: notifying ${unread.length} user(s) of unread messages`);

    await Promise.allSettled(
      unread.map(async ({ chatUser, email }) => {
        try {
          await sendMailchimpUserEvent(email, MAILCHIMP_CUSTOM_EVENTS.FRONT_MESSAGE_UNREAD);
          await this.frontChatService.markUnreadNotified(chatUser.id);
        } catch (err) {
          this.logger.warn(
            `FrontChatScheduler: failed to notify ${email}: ${(err as Error)?.message || 'unknown error'}`,
          );
        }
      }),
    );
  }
}
