import { Injectable } from '@nestjs/common';
import { Crisp } from 'crisp-api';
import { Logger } from 'src/logger/logger';
import { crispIdentifier, crispKey, crispWebsiteId } from 'src/utils/constants';
import {
  ConversationMigrationData,
  CrispConversation,
  CrispMessage,
  CrispNote,
} from './crisp-migration.interface';

const logger = new Logger('CrispExportService');

// Crisp returns 20 conversations per page.
const CRISP_PAGE_SIZE = 20;

@Injectable()
export class CrispExportService {
  private crispClient: Crisp;

  constructor() {
    this.crispClient = new Crisp();
    // 'website' tier tokens are generated directly inside the Crisp workspace
    // (no marketplace plugin account required) and have a 10k req/day quota.
    this.crispClient.authenticateTier('website', crispIdentifier, crispKey);
    logger.log('Crisp API client initialized');
  }

  /**
   * Fetch all conversations updated since the given date.
   *
   * Crisp returns conversations sorted newest-first (by updated_at). We paginate
   * until we receive a page where every conversation is older than our cutoff —
   * at that point we've seen everything within the window.
   */
  async getConversationsSince(since: Date): Promise<CrispConversation[]> {
    logger.log(`Fetching conversations since ${since.toISOString()}`);
    const cutoffTimestamp = Math.floor(since.getTime() / 1000);
    const conversations: CrispConversation[] = [];
    let page = 1;

    while (true) {
      logger.log(`Fetching conversation page ${page}…`);

      let response: CrispConversation[];
      try {
        response = (await this.crispClient.website.listConversations(
          crispWebsiteId,
          page,
        )) as unknown as CrispConversation[];
      } catch (error) {
        logger.error(`Failed to fetch conversation page ${page}: ${(error as Error).message}`);
        throw new Error(`Failed to fetch conversations from Crisp: ${(error as Error).message}`, { cause: error });
      }

      if (!response || response.length === 0) break;

      const withinRange = response.filter((conv) => {
        const ts = conv.updated_at ?? conv.created_at ?? 0;
        return ts >= cutoffTimestamp;
      });

      conversations.push(...withinRange);

      // Stop when we get a partial page (end of data) or when the oldest
      // conversation on this page is already past our cutoff — everything
      // deeper will be older still.
      const oldestOnPage = Math.min(
        ...response.map((c) => c.updated_at ?? c.created_at ?? Infinity),
      );
      if (response.length < CRISP_PAGE_SIZE || oldestOnPage < cutoffTimestamp) break;

      page++;
    }

    logger.log(`Fetched ${conversations.length} conversations since ${since.toISOString()}`);
    return conversations;
  }

  /**
   * Fetch all messages for a conversation, paginating via timestamp_before.
   * Crisp returns messages newest-first; we collect all pages then reverse.
   */
  async getConversationMessages(sessionId: string): Promise<CrispMessage[]> {
    logger.log(`Fetching messages for conversation ${sessionId}`);
    const messages: CrispMessage[] = [];
    let timestampBefore: number | undefined;

    try {
      while (true) {
        const response = (await this.crispClient.website.getMessagesInConversation(
          crispWebsiteId,
          sessionId,
          timestampBefore,
        )) as unknown as CrispMessage[];

        if (!response || response.length === 0) break;

        messages.push(...response);

        if (messages.length > 10_000) {
          logger.warn(`Conversation ${sessionId} has >10 000 messages — stopping pagination`);
          break;
        }

        // Move the cursor to just before the oldest message on this page.
        const oldest = Math.min(...response.map((m) => m.timestamp ?? Infinity));
        if (!isFinite(oldest) || oldest === timestampBefore) break;
        timestampBefore = oldest;
      }
    } catch (error) {
      logger.error(
        `Failed to fetch messages for ${sessionId}: ${(error as Error).message}`,
      );
      throw new Error(`Failed to fetch messages for ${sessionId}: ${(error as Error).message}`, { cause: error });
    }

    logger.log(`Fetched ${messages.length} messages for conversation ${sessionId}`);
    return messages;
  }

  /**
   * Fetch the full conversation object (includes contact meta: email, nickname, etc.).
   */
  async getConversationMetadata(sessionId: string): Promise<CrispConversation> {
    try {
      return (await this.crispClient.website.getConversation(
        crispWebsiteId,
        sessionId,
      )) as unknown as CrispConversation;
    } catch (error) {
      logger.error(`Failed to fetch metadata for ${sessionId}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch metadata for ${sessionId}: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * Return all data for a single conversation ready for import.
   * Notes (type === 'note') are separated from regular messages.
   */
  async getConversationData(sessionId: string): Promise<ConversationMigrationData> {
    logger.log(`Getting full data for conversation ${sessionId}`);

    const [metadata, allMessages] = await Promise.all([
      this.getConversationMetadata(sessionId),
      this.getConversationMessages(sessionId),
    ]);

    const notes: CrispNote[] = allMessages
      .filter((m) => m.type === 'note')
      .map((m) => ({
        type: m.type,
        from: m.from,
        content: m.content || '',
        timestamp: m.timestamp ?? Date.now(),
        user: m.user,
      }));

    const messages = allMessages.filter((m) => m.type !== 'note');

    logger.log(`Conversation ${sessionId}: ${messages.length} messages, ${notes.length} notes`);

    return {
      sessionId,
      email: metadata.meta?.email ?? metadata.email,
      name: metadata.meta?.nickname ?? metadata.nickname,
      messages,
      notes,
      metadata,
      createdAt: new Date((metadata.created_at ?? Date.now() / 1000) * 1000),
      updatedAt: new Date((metadata.updated_at ?? Date.now() / 1000) * 1000),
    };
  }
}
