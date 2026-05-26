import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { ChatUserService } from 'src/chat-user/chat-user.service';
import { Logger } from 'src/logger/logger';
import { ServiceUserProfilesService } from 'src/service-user-profiles/service-user-profiles.service';

@Injectable()
export class FrontChatScheduler {
  private readonly logger = new Logger('FrontChatScheduler');

  constructor(
    private readonly chatUserService: ChatUserService,
    private readonly serviceUserProfilesService: ServiceUserProfilesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUnreadMessages(): Promise<void> {
    // Sweep stale PENDING rows back to FAILED so the retry path can pick them up on
    // this same tick. Isolated in a try/catch — a sweep failure must not block sends.
    try {
      const recovered = await this.chatUserService.recoverStalePendingNotifications();
      if (recovered > 0) {
        this.logger.warn(
          `FrontChatScheduler: recovered ${recovered} stale PENDING notification(s) → FAILED`,
        );
      }
    } catch (err) {
      this.logger.error(
        `FrontChatScheduler: stale PENDING sweep failed: ${(err as Error)?.message || 'unknown error'}`,
      );
    }

    const unread = await this.chatUserService.getUsersWithUnreadMessages();
    if (!unread.length) return;

    this.logger.log(`FrontChatScheduler: notifying ${unread.length} user(s) of unread messages`);

    const results = await Promise.allSettled(
      unread.map(async ({ chatUser, email }) => {
        // Mark pending before the API call so a restart between these two operations
        // doesn't cause a duplicate send on the next cron fire.
        try {
          await this.chatUserService.markUnreadNotificationPending(chatUser.id);
        } catch (err) {
          this.logger.warn(
            `FrontChatScheduler: failed to mark pending for chatUser ${chatUser.id}, skipping send: ${(err as Error)?.message || 'unknown error'}`,
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
          this.logger.error(
            `FrontChatScheduler: Mailchimp event failed for chatUser ${chatUser.id}: ${message}`,
          );
          await this.chatUserService
            .markUnreadNotificationFailed(chatUser.id, message)
            .catch((dbErr) => {
              this.logger.error(
                `FrontChatScheduler: failed to record FAILED for chatUser ${chatUser.id} (row stays PENDING, will recover on next message): ${(dbErr as Error)?.message || 'unknown error'}`,
              );
            });
          return;
        }

        // Mailchimp succeeded — recording the SENT state
        try {
          await this.chatUserService.markUnreadNotificationSent(chatUser.id);
        } catch (err) {
          this.logger.error(
            `FrontChatScheduler: Mailchimp event sent for chatUser ${chatUser.id} but recording SENT failed (row stays PENDING): ${(err as Error)?.message || 'unknown error'}`,
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
