import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { UNREAD_NOTIFICATION_STATUS } from 'src/front-chat/front-chat.interface';
import { Brackets, ILike, Repository } from 'typeorm';

const UNREAD_NOTIFICATION_MAX_ATTEMPTS = 3;
const UNREAD_NOTIFICATION_COOLDOWN_HOURS = 2;
const UNREAD_NOTIFICATION_PENDING_TIMEOUT_MINUTES = 10;

@Injectable()
export class ChatUserService {
  constructor(
    @InjectRepository(ChatUserEntity)
    private readonly chatUserRepository: Repository<ChatUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getOrCreateChatUser(
    userId: string,
    initial: Partial<ChatUserEntity> = {},
  ): Promise<ChatUserEntity> {
    const existing = await this.chatUserRepository.findOneBy({ userId });
    if (existing) {
      const updates: Partial<ChatUserEntity> = {};
      for (const [key, value] of Object.entries(initial) as [keyof ChatUserEntity, unknown][]) {
        if (value != null && existing[key] == null) {
          (updates as Record<string, unknown>)[key] = value;
        }
      }
      if (Object.keys(updates).length > 0) {
        return this.chatUserRepository.save({ ...existing, ...updates });
      }
      return existing;
    }

    try {
      const chatUser = this.chatUserRepository.create({ userId, ...initial });
      return await this.chatUserRepository.save(chatUser);
    } catch {
      // Handle unique constraint race condition
      const retry = await this.chatUserRepository.findOneBy({ userId });
      if (retry) return retry;
      throw new Error(`Failed to create ChatUser for userId ${userId}`);
    }
  }

  async getChatUser(userId: string): Promise<ChatUserEntity | null> {
    return this.chatUserRepository.findOneBy({ userId });
  }

  async updateChatUser(
    userId: string,
    partial: Partial<ChatUserEntity>,
  ): Promise<ChatUserEntity | null> {
    const chatUser = await this.chatUserRepository.findOneBy({ userId });
    if (!chatUser) return null;
    return this.chatUserRepository.save({
      ...chatUser,
      ...this.preserveConversationId(chatUser, partial),
    });
  }

  async updateChatUserByEmail(
    email: string,
    partial: Partial<ChatUserEntity>,
  ): Promise<ChatUserEntity | null> {
    let chatUser = await this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoin('cu.user', 'u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();

    if (!chatUser) {
      // User predates ChatUser table — look up the user and create a record
      const user = await this.userRepository.findOneBy({ email: ILike(email) });
      if (!user) return null;
      chatUser = await this.getOrCreateChatUser(user.id);
    }

    return this.chatUserRepository.save({
      ...chatUser,
      ...this.preserveConversationId(chatUser, partial),
    });
  }

  async getChatUserByEmail(email: string): Promise<ChatUserEntity | null> {
    return this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoin('cu.user', 'u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  async clearConversationId(userId: string): Promise<void> {
    await this.chatUserRepository.update({ userId }, { frontConversationId: null });
  }

  async setLastMessageSentAt(chatUser: ChatUserEntity, sentAt: Date): Promise<ChatUserEntity> {
    return this.chatUserRepository.save({ ...chatUser, lastMessageSentAt: sentAt });
  }

  async getUsersWithUnreadMessages(): Promise<{ chatUser: ChatUserEntity; email: string }[]> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const rows = await this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoinAndSelect('cu.user', 'u')
      .where('cu.lastMessageReceivedAt IS NOT NULL')
      .andWhere('(cu.lastMessageReadAt IS NULL OR cu.lastMessageReadAt < cu.lastMessageReceivedAt)')
      // Never re-trigger for dead addresses — Mailchimp delivery is impossible and retries hurt sender reputation.
      .andWhere(
        '(cu.unreadNotificationStatus IS NULL OR cu.unreadNotificationStatus NOT IN (:...terminalStatuses))',
        {
          terminalStatuses: [
            UNREAD_NOTIFICATION_STATUS.BOUNCED,
            UNREAD_NOTIFICATION_STATUS.CLEANED,
          ],
        },
      )
      .andWhere(
        new Brackets((qb) => {
          qb
            // New unread: first notification (no prior attempt), or a follow-up message
            // that the agent sent more than 2 hours after the last notification — i.e. an
            // intentional re-contact, not a burst of messages in the same session.
            .where(
              'cu.lastMessageReceivedAt < :cutoff AND (cu.unreadNotificationAttemptedAt IS NULL OR cu.lastMessageReceivedAt - cu.unreadNotificationAttemptedAt > :cooldownInterval::interval)',
              { cutoff, cooldownInterval: `${UNREAD_NOTIFICATION_COOLDOWN_HOURS} hours` },
            )
            // Transient failure: previous trigger threw and retries remain.
            // Cooldown does not apply — retries must fire promptly.
            .orWhere(
              'cu.unreadNotificationStatus = :failedStatus AND cu.unreadNotificationAttempts < :maxAttempts',
              {
                failedStatus: UNREAD_NOTIFICATION_STATUS.FAILED,
                maxAttempts: UNREAD_NOTIFICATION_MAX_ATTEMPTS,
              },
            );
        }),
      )
      .getMany();

    return rows.map((cu) => ({ chatUser: cu, email: cu.user.email }));
  }

  async markUnreadNotificationPending(chatUserId: string): Promise<void> {
    await this.chatUserRepository.update(
      { id: chatUserId },
      {
        unreadNotificationAttemptedAt: new Date(),
        unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.PENDING,
        unreadNotificationAttempts: () => '"unreadNotificationAttempts" + 1',
        unreadNotificationError: null,
      },
    );
  }

  async markUnreadNotificationSent(chatUserId: string): Promise<void> {
    await this.chatUserRepository.update(
      { id: chatUserId, unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.PENDING },
      {
        unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.SENT,
        unreadNotificationAttempts: 0,
      },
    );
  }

  async markUnreadNotificationFailed(chatUserId: string, error: string): Promise<void> {
    await this.chatUserRepository.update(
      { id: chatUserId, unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.PENDING },
      {
        unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.FAILED,
        unreadNotificationError: error,
      },
    );
  }

  // Recovers rows stuck in PENDING — flips them to FAILED so the retry path picks them
  // up on the same tick. A row sits at PENDING when the process dies (or the DB write
  // for SENT/FAILED fails) between markPending and the terminal write; without this
  // sweep the row only recovers when a new agent message advances lastMessageReceivedAt
  // past the 2h cooldown, which may never happen.
  async recoverStalePendingNotifications(): Promise<number> {
    const staleCutoff = new Date(
      Date.now() - UNREAD_NOTIFICATION_PENDING_TIMEOUT_MINUTES * 60 * 1000,
    );
    const result = await this.chatUserRepository
      .createQueryBuilder()
      .update(ChatUserEntity)
      .set({
        unreadNotificationStatus: UNREAD_NOTIFICATION_STATUS.FAILED,
        unreadNotificationError: `pending timeout (>${UNREAD_NOTIFICATION_PENDING_TIMEOUT_MINUTES}m) — scheduler crashed mid-send or terminal write failed`,
      })
      .where('"unreadNotificationStatus" = :pending', {
        pending: UNREAD_NOTIFICATION_STATUS.PENDING,
      })
      .andWhere('"unreadNotificationAttemptedAt" < :staleCutoff', { staleCutoff })
      .execute();
    return result.affected ?? 0;
  }

  async markUnreadNotificationDeliveryFailure(
    email: string,
    status: UNREAD_NOTIFICATION_STATUS.BOUNCED | UNREAD_NOTIFICATION_STATUS.CLEANED,
    error: string,
  ): Promise<void> {
    const chatUser = await this.getChatUserByEmail(email);
    if (!chatUser) return;
    if (
      chatUser.unreadNotificationStatus === UNREAD_NOTIFICATION_STATUS.BOUNCED ||
      chatUser.unreadNotificationStatus === UNREAD_NOTIFICATION_STATUS.CLEANED
    ) {
      return;
    }
    await this.chatUserRepository.update(
      { id: chatUser.id },
      { unreadNotificationStatus: status, unreadNotificationError: error },
    );
  }

  async markAsRead(userId: string): Promise<ChatUserEntity | null> {
    const chatUser = await this.chatUserRepository.findOneBy({ userId });
    if (!chatUser) return null;

    // Nothing to mark as read if the agent has never sent a message.
    if (!chatUser.lastMessageReceivedAt) return null;

    // Already up to date — don't write or sync unnecessarily.
    if (
      chatUser.lastMessageReadAt &&
      chatUser.lastMessageReadAt >= chatUser.lastMessageReceivedAt
    ) {
      return null;
    }

    return this.chatUserRepository.save({ ...chatUser, lastMessageReadAt: new Date() });
  }

  // Once a user is linked to a Front conversation that link is sticky — partial updates
  // must never overwrite an existing frontConversationId.
  private preserveConversationId(
    chatUser: ChatUserEntity,
    partial: Partial<ChatUserEntity>,
  ): Partial<ChatUserEntity> {
    if (!chatUser.frontConversationId) return partial;
    const { frontConversationId: _omit, ...rest } = partial;
    return rest;
  }
}
