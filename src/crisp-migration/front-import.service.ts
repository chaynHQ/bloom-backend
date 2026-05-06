import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { frontChannelId, frontChatApiToken, frontContactListId } from 'src/utils/constants';
import { ConversationMigrationData, CrispMessage, CrispNote } from './crisp-migration.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontImportService');

const INTER_MESSAGE_DELAY_MS = 200;
const MAX_RETRIES = 3;

const SUPPORT_SENDER_HANDLE = process.env.FRONT_SUPPORT_EMAIL || 'support@bloom.chayn.co';
const SUPPORT_SENDER_NAME = 'Bloom Support';

interface ImportedConversationResult {
  conversationId: string;
  messageIds: string[];
  commentIds: string[];
}

// 202 Accepted response from POST /inboxes/{id}/imported_messages
interface FrontImportAccepted {
  status: string;
  message_uid: string;
}

// GET /channels/{id} — used to discover the inbox linked to the channel
interface FrontChannelResponse {
  _links?: { related?: { inbox?: string } };
}

@Injectable()
export class FrontImportService {
  private resolvedInboxId: string | undefined;

  async getInboxId(): Promise<string> {
    if (this.resolvedInboxId) return this.resolvedInboxId;

    if (!frontChannelId) {
      throw new Error('FRONT_CHANNEL_ID is not set. Required to discover the linked inbox.');
    }

    logger.log(`Resolving inbox ID from channel ${frontChannelId}…`);

    const channel = (await this.frontApiRequest(
      'GET',
      `/channels/${frontChannelId}`,
    )) as FrontChannelResponse;
    const inboxUrl = channel._links?.related?.inbox;

    if (!inboxUrl) {
      throw new Error(`Could not find inbox linked to channel ${frontChannelId}.`);
    }

    this.resolvedInboxId = inboxUrl.split('/').pop()!;
    logger.log(`Resolved inbox ID: ${this.resolvedInboxId}`);
    return this.resolvedInboxId;
  }

  async getOrCreateFrontContact(email: string, name?: string): Promise<string> {
    const alias = `alt:email:${encodeURIComponent(email)}`;
    let contactId: string | undefined;

    try {
      const existing = (await this.frontApiRequest('GET', `/contacts/${alias}`)) as { id: string };
      logger.log(`Contact already exists in Front: ${email} (${existing.id})`);
      contactId = existing.id;
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
    }

    if (!contactId) {
      logger.log(`Creating Front contact for ${email}`);
      const body: Record<string, unknown> = {
        handles: [
          { handle: email, source: 'email' },
          { handle: email, source: 'custom' },
        ],
      };
      if (name) body.name = name;
      const created = (await this.frontApiRequest('POST', '/contacts', body)) as { id: string };
      contactId = created.id;
      logger.log(`Created Front contact: ${email} (${contactId})`);
    }

    if (frontContactListId) {
      try {
        await this.frontApiRequest('POST', `/contact_lists/${frontContactListId}/contacts`, {
          contact_ids: [contactId],
        });
        logger.log(`Added ${email} to contact list ${frontContactListId}`);
      } catch (err) {
        logger.warn(`Failed to add ${email} to contact list: ${(err as Error).message}`);
      }
    }

    return contactId;
  }

  async importConversation(
    data: ConversationMigrationData,
    options: {
      dryRun: boolean;
      skipAttachments: boolean;
      skipNotes: boolean;
      existingConversationId?: string;
    },
  ): Promise<ImportedConversationResult> {
    const { sessionId, email, name, messages, notes } = data;

    if (options.dryRun) {
      logger.log(`[DRY RUN] Would import conversation ${sessionId} (${messages.length} messages)`);
      return { conversationId: `dry-run-${sessionId}`, messageIds: [], commentIds: [] };
    }

    const inboxId = await this.getInboxId();
    logger.log(`Importing ${sessionId} — ${messages.length} messages, ${notes.length} notes`);

    // Deleted users have a hashed ID as their Crisp email (no '@'); give them a stable fake address
    const userEmail = !email
      ? `unknown-${sessionId}@crisp-import.local`
      : email.includes('@')
        ? email
        : `${email}@deleted.chayn.co`;
    const userName = name || 'Unknown User';
    const sorted = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const isResolved = data.metadata.state === 'resolved';
    const messageIds: string[] = [];
    let conversationId: string | undefined = options.existingConversationId;
    let lastMessageUid: string | undefined;
    for (const msg of sorted) {
      if (!this.isImportableMessage(msg)) continue;

      let messageUid: string | undefined;
      try {
        messageUid = await this.importOneMessage(
          msg,
          userEmail,
          userName,
          sessionId,
          conversationId,
          inboxId,
          options.skipAttachments,
          isResolved,
        );
      } catch (err) {
        const isMismatch = (err as Error).message?.includes('different message type');
        if (isMismatch && conversationId) {
          logger.warn(
            `Message type mismatch on conversation ${conversationId} — resetting and retrying without conversation ID`,
          );
          conversationId = undefined;
          messageUid = await this.importOneMessage(
            msg,
            userEmail,
            userName,
            sessionId,
            undefined,
            inboxId,
            options.skipAttachments,
            isResolved,
          );
        } else {
          throw err;
        }
      }

      if (messageUid) {
        messageIds.push(messageUid);
        lastMessageUid = messageUid;

        if (!conversationId) {
          conversationId = await this.resolveConversationId(messageUid, userEmail);
          if (conversationId) {
            logger.log(`Resolved conversation ${conversationId} for session ${sessionId}`);
          }
        }
      }

      await this.delay(INTER_MESSAGE_DELAY_MS);
    }

    if (!conversationId) {
      if (messageIds.length === 0) {
        logger.warn(`No importable messages in session ${sessionId} — skipping`);
        return { conversationId: '', messageIds: [], commentIds: [] };
      }
      logger.warn(
        `Imported ${messageIds.length} message(s) for session ${sessionId} but could not resolve conversation ID — messages may be fragmented across multiple Front conversations`,
      );
      return { conversationId: '', messageIds, commentIds: [] };
    }

    const commentIds: string[] = [];
    if (!options.skipNotes && notes.length > 0) {
      const sortedNotes = [...notes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      for (const note of sortedNotes) {
        try {
          const commentId = await this.addComment(conversationId, note);
          if (commentId) commentIds.push(commentId);
        } catch (err) {
          logger.warn(
            `Failed to add note as comment on ${conversationId}: ${(err as Error).message}`,
          );
        }
        await this.delay(INTER_MESSAGE_DELAY_MS);
      }
    }

    if (isResolved) {
      try {
        if (lastMessageUid) {
          await this.waitForMessageProcessed(lastMessageUid);
        }
        await this.frontApiRequest('PATCH', `/conversations/${conversationId}`, {
          status: 'archived',
        });
        logger.log(`Archived conversation ${conversationId}`);
      } catch (err) {
        logger.warn(`Failed to archive conversation ${conversationId}: ${(err as Error).message}`);
      }
    }

    logger.log(
      `Imported session ${sessionId} → ${conversationId} (${messageIds.length} messages, ${commentIds.length} comments, resolved: ${isResolved})`,
    );
    return { conversationId, messageIds, commentIds };
  }

  private async importOneMessage(
    msg: CrispMessage,
    userEmail: string,
    userName: string,
    sessionId: string,
    conversationId: string | undefined,
    inboxId: string,
    skipAttachments: boolean,
    isResolved: boolean,
  ): Promise<string | undefined> {
    const isInbound = msg.from === 'user';
    const createdAt = Math.floor((msg.timestamp || Date.now()) / 1000);
    const externalId = `crisp-${sessionId}-${msg.fingerprint ?? msg.timestamp ?? Math.random()}`;

    const sender = isInbound
      ? { handle: userEmail, name: userName }
      : { handle: SUPPORT_SENDER_HANDLE, name: this.resolveOperatorName(msg) };

    const to = isInbound ? [SUPPORT_SENDER_HANDLE] : [userEmail];

    if (msg.type === 'file' && !skipAttachments) {
      return this.importFileMessage(
        msg,
        sender,
        to,
        externalId,
        createdAt,
        isInbound,
        conversationId,
        inboxId,
        isResolved,
      );
    }

    const body = this.extractMessageText(msg);
    if (!body) return undefined;

    const payload: Record<string, unknown> = {
      sender,
      to,
      body,
      body_format: 'markdown',
      external_id: externalId,
      created_at: createdAt,
      metadata: { is_inbound: isInbound, is_archived: isResolved, should_skip_rules: true },
    };
    if (conversationId) payload.conversation_id = conversationId;

    const response = (await this.frontApiRequest(
      'POST',
      `/inboxes/${inboxId}/imported_messages`,
      payload,
    )) as FrontImportAccepted;

    return response.message_uid;
  }

  private async importFileMessage(
    msg: CrispMessage,
    sender: { handle: string; name: string },
    to: string[],
    externalId: string,
    createdAt: number,
    isInbound: boolean,
    conversationId: string | undefined,
    inboxId: string,
    isResolved: boolean,
  ): Promise<string | undefined> {
    let fileData: { url?: string; name?: string; type?: string };
    try {
      const raw = msg.content;
      if (!raw) return undefined;
      fileData =
        typeof raw === 'string'
          ? (JSON.parse(raw) as { url?: string; name?: string; type?: string })
          : (raw as unknown as { url?: string; name?: string; type?: string });
    } catch {
      logger.warn(`Could not parse file content for ${externalId}`);
      return undefined;
    }
    if (!fileData.url) return undefined;

    const fileName = fileData.name || 'Attachment';
    const isImage =
      fileData.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName);

    const body = isImage ? `![${fileName}](${fileData.url})` : `📎 [${fileName}](${fileData.url})`;

    const payload: Record<string, unknown> = {
      sender,
      to,
      body,
      body_format: 'markdown',
      external_id: externalId,
      created_at: createdAt,
      metadata: { is_inbound: isInbound, is_archived: isResolved, should_skip_rules: true },
    };
    if (conversationId) payload.conversation_id = conversationId;

    const r = (await this.frontApiRequest(
      'POST',
      `/inboxes/${inboxId}/imported_messages`,
      payload,
    )) as FrontImportAccepted;
    return r.message_uid;
  }

  private async waitForMessageProcessed(messageUid: string): Promise<void> {
    const delays = [500, 1500];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      await this.delay(delays[attempt]);
      try {
        await this.frontApiRequest('GET', `/messages/alt:uid:${messageUid}`);
        return;
      } catch (err) {
        const isNotFound = (err as { status?: number }).status === 404;
        if (!isNotFound || attempt === delays.length - 1) {
          logger.warn(
            `Message ${messageUid} not confirmed processed before archive — proceeding anyway`,
          );
          return;
        }
        logger.log(`Waiting for message ${messageUid} to be processed (attempt ${attempt + 1})…`);
      }
    }
  }

  private async resolveConversationId(
    _messageUid: string,
    userEmail?: string,
  ): Promise<string | undefined> {
    if (!userEmail) return undefined;
    return this.resolveConversationIdByContact(userEmail);
  }

  private async resolveConversationIdByContact(email: string): Promise<string | undefined> {
    const alias = `alt:email:${encodeURIComponent(email)}`;
    // Front processes imported messages asynchronously. Wait enough time before first check,
    // then retry — the newly created conversation will have the highest created_at.
    const delays = [5000, 3000, 3000, 3000];

    for (let attempt = 0; attempt < delays.length; attempt++) {
      await this.delay(delays[attempt]);
      try {
        const resp = (await this.frontApiRequest('GET', `/contacts/${alias}/conversations`)) as {
          _results: Array<{ id: string; created_at: number }>;
        };

        // Sort by created_at descending — the conversation we just created will be newest
        const sorted = (resp._results || []).sort((a, b) => b.created_at - a.created_at);

        if (sorted[0]) {
          logger.log(`Resolved conversation ${sorted[0].id} for ${email}`);
          return sorted[0].id;
        }

        if (attempt < delays.length - 1) {
          logger.log(`No conversations for ${email} yet, retrying (attempt ${attempt + 1})…`);
        } else {
          logger.warn(
            `No conversations found in Front for ${email} after ${delays.length} attempts`,
          );
        }
      } catch (err) {
        logger.warn(`Could not resolve conversation for ${email}: ${(err as Error).message}`);
        return undefined;
      }
    }
    return undefined;
  }

  private async addComment(conversationId: string, note: CrispNote): Promise<string | undefined> {
    const body = note.content?.trim();
    if (!body) return undefined;

    const authorLabel = note.user?.nickname ? ` (${note.user.nickname})` : '';
    const dateLabel = note.timestamp
      ? ` on ${new Date(note.timestamp).toISOString().slice(0, 10)}`
      : '';

    const commentBody = `**[Crisp Admin Note made by${authorLabel}${dateLabel}]**\n\n${body}`;
    const result = (await this.frontApiRequest(
      'POST',
      `/conversations/${conversationId}/comments`,
      {
        body: commentBody,
      },
    )) as { id?: string };

    logger.log(`Added comment to ${conversationId}`);
    return result.id;
  }

  private resolveOperatorName(msg: CrispMessage): string {
    return msg.user?.nickname || SUPPORT_SENDER_NAME;
  }

  private extractMessageText(msg: CrispMessage): string {
    const rawContent =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
          ? JSON.stringify(msg.content)
          : '';
    if (msg.type === 'text') return this.sanitiseBody(rawContent);
    if (msg.type === 'picker') {
      try {
        const parsed = JSON.parse(rawContent || '{}') as {
          text?: string;
          choices?: Array<{ label?: string }>;
        };
        const choices = (parsed.choices || []).map((c) => `- ${c.label}`).join('\n');
        return [parsed.text, choices].filter(Boolean).join('\n');
      } catch {
        return this.sanitiseBody(rawContent);
      }
    }
    return this.sanitiseBody(rawContent);
  }

  private sanitiseBody(content: string): string {
    return content
      .replace(/<img[^>]+src=["']?(https?:\/\/[^\s"'>]+)["']?[^>]*>/gi, '![]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
  }

  private isImportableMessage(msg: CrispMessage): boolean {
    if (msg.automated) {
      return false;
    }
    if (msg.type === 'note') {
      return false;
    }
    if (!msg.content && msg.type !== 'file') {
      return false;
    }
    const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    if (contentStr.startsWith('Hi there, chat here with survivors')) {
      return false;
    }
    if (contentStr.startsWith('{"namespace":')) {
      return false;
    }
    return true;
  }

  private async frontApiRequest(
    method: string,
    path: string,
    body?: unknown,
    attempt = 0,
  ): Promise<unknown> {
    const response = await fetch(`${FRONT_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${frontChatApiToken}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errBody = await response.text();

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryMs = this.parseRetryDelayMs(errBody) ?? 500;
        logger.warn(
          `Rate limited on ${method} ${path} — retrying in ${retryMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await this.delay(retryMs + 50);
        return this.frontApiRequest(method, path, body, attempt + 1);
      }

      const err = new Error(
        `Front API ${method} ${path} failed (${response.status}): ${errBody}`,
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  private parseRetryDelayMs(errBody: string): number | undefined {
    try {
      const parsed = JSON.parse(errBody) as { _error?: { message?: string } };
      const match = parsed._error?.message?.match(/retry in (\d+) milliseconds/i);
      if (match) return parseInt(match[1], 10);
    } catch {
      // ignore
    }
    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
