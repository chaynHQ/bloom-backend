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

    const results = await Promise.allSettled(
      unread.map(async ({ chatUser, email }) => {
        // Mark pending before the API call so a restart between these two operations
        // doesn't cause a duplicate send on the next cron fire.
        try {
          await this.frontChatService.markUnreadNotificationPending(chatUser.id);
        } catch (err) {
          this.logger.warn(
            `FrontChatScheduler: failed to mark pending for ${email}, skipping send: ${(err as Error)?.message || 'unknown error'}`,
          );
          return;
        }

        try {
          // Send mailchimp event with recovery wrapper
          // Gets or recreates an archived/missing Mailchimp profile before event
          await this.serviceUserProfilesService.sendMailchimpUserEventWithRecovery(
            email,
            MAILCHIMP_CUSTOM_EVENTS.FRONT_MESSAGE_UNREAD,
          );
        } catch (err) {
          const message = (err as Error)?.message || 'unknown error';
          this.logger.error(`FrontChatScheduler: Mailchimp event failed for ${email}: ${message}`);
          await this.frontChatService
            .markUnreadNotificationFailed(chatUser.id, message)
            .catch((dbErr) => {
              this.logger.error(
                `FrontChatScheduler: failed to record FAILED for ${email} (row stays PENDING, will recover on next message): ${(dbErr as Error)?.message || 'unknown error'}`,
              );
            });
          return;
        }

        // Mailchimp succeeded — recording the SENT state
        try {
          await this.frontChatService.markUnreadNotificationSent(chatUser.id);
        } catch (err) {
          this.logger.error(
            `FrontChatScheduler: Mailchimp event sent for ${email} but recording SENT failed (row stays PENDING): ${(err as Error)?.message || 'unknown error'}`,
          );
        }
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `FrontChatScheduler: unhandled error sending unread notification: ${(result.reason as Error)?.message || result.reason}`,
        );
      }
    }
  }
}
