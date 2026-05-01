import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { frontChatApiToken, frontChannelId, frontContactListId } from 'src/utils/constants';
import { ConversationMigrationData, CrispMessage, CrispNote } from './crisp-migration.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontImportService');

// Generic sender handle used for outbound (agent→user) messages where we can't
// attribute to a specific operator. Must be a valid email handle in Front.
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

// GET /messages/alt:uid:{uid} — used to resolve the conversation ID
interface FrontMessageWithLinks {
  _links?: { related?: { conversation?: string } };
}

// GET /channels/{id} — used to discover the inbox linked to the channel
interface FrontChannelResponse {
  _links?: { related?: { inbox?: string } };
}

@Injectable()
export class FrontImportService {
  // Resolved once per service lifecycle via discoverInboxId().
  private resolvedInboxId: string | undefined;

  // ── Inbox discovery ─────────────────────────────────────────────────────────

  /**
   * Return the Front inbox ID to use for all imports.
   *
   * We derive it from the existing FRONT_CHANNEL_ID rather than requiring a
   * separate env var. Every Front custom application channel is linked to one
   * inbox; GET /channels/{id} exposes that link in _links.related.inbox.
   *
   * The result is cached — we only hit the API once per process lifetime.
   */
  async getInboxId(): Promise<string> {
    if (this.resolvedInboxId) return this.resolvedInboxId;

    if (!frontChannelId) {
      throw new Error(
        'FRONT_CHANNEL_ID is not set. It is required to discover the linked inbox for message import.',
      );
    }

    logger.log(`Resolving inbox ID from channel ${frontChannelId}…`);

    const channel = (await this.frontApiRequest(
      'GET',
      `/channels/${frontChannelId}`,
    )) as FrontChannelResponse;

    const inboxUrl = channel._links?.related?.inbox;
    if (!inboxUrl) {
      throw new Error(
        `Could not find inbox linked to channel ${frontChannelId}. ` +
          'Check that FRONT_CHANNEL_ID is correct and the API token has inbox read access.',
      );
    }

    this.resolvedInboxId = inboxUrl.split('/').pop()!;
    logger.log(`Resolved inbox ID: ${this.resolvedInboxId}`);
    return this.resolvedInboxId;
  }

  // ── Contact management ──────────────────────────────────────────────────────

  /**
   * Ensure a contact exists in Front and is a member of the configured contact
   * list. Creates the contact if it doesn't exist. Always attempts to add to
   * the list — Front treats duplicate list membership as a no-op.
   *
   * Returns the canonical Front contact ID (crd_xxx).
   */
  async ensureContact(email: string, name?: string): Promise<string> {
    const alias = `alt:email:${encodeURIComponent(email)}`;
    let contactId: string | undefined;

    try {
      const existing = (await this.frontApiRequest('GET', `/contacts/${alias}`)) as {
        id: string;
      };
      logger.log(`Contact already exists in Front: ${email} (${existing.id})`);
      contactId = existing.id;
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
    }

    if (!contactId) {
      logger.log(`Creating Front contact for ${email}`);
      const body: Record<string, unknown> = {
        handles: [{ handle: email, source: 'email' }],
      };
      if (name) body.name = name;

      const created = (await this.frontApiRequest('POST', '/contacts', body)) as { id: string };
      contactId = created.id;
      logger.log(`Created Front contact: ${email} (${contactId})`);
    }

    // Always add to the list — safe even if already a member.
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

  // ── Conversation import ─────────────────────────────────────────────────────

  /**
   * Import a full Crisp conversation into the Front inbox linked to the channel.
   *
   * How it works:
   *  1. Resolve the inbox ID from the existing FRONT_CHANNEL_ID (cached).
   *  2. Sort messages oldest-first.
   *  3. POST the first message to /inboxes/{id}/imported_messages.
   *     Front responds 202 with { message_uid }.
   *  4. Resolve the conversation_id by calling GET /messages/alt:uid:{message_uid}
   *     (same pattern FrontChatService uses for live messages).
   *  5. Thread every subsequent message into the same conversation by setting
   *     conversation_id in the request body.
   *  6. Add Crisp admin notes as private Front comments on the conversation.
   *  7. Archive the conversation so it doesn't appear in active queues.
   *
   * Inbound vs outbound:
   *   msg.from === 'user'     → sender = user email,         to = []
   *   msg.from === 'operator' → sender = SUPPORT_SENDER_HANDLE, to = [user email]
   *
   * Idempotency: external_id = crisp-{sessionId}-{fingerprint} prevents
   * re-importing the same message on re-runs. Front deduplicates silently.
   */
  async importConversation(
    data: ConversationMigrationData,
    options: { dryRun: boolean; skipAttachments: boolean; skipNotes: boolean },
  ): Promise<ImportedConversationResult> {
    const { sessionId, email, name, messages, notes } = data;

    if (options.dryRun) {
      logger.log(`[DRY RUN] Would import conversation ${sessionId} (${messages.length} messages)`);
      return { conversationId: `dry-run-${sessionId}`, messageIds: [], commentIds: [] };
    }

    const inboxId = await this.getInboxId();

    logger.log(`Importing ${sessionId} — ${messages.length} messages, ${notes.length} notes`);

    const userEmail = email || `unknown-${sessionId}@crisp-import.local`;
    const userName = name || 'Unknown User';

    const sorted = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const messageIds: string[] = [];
    let conversationId: string | undefined;

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      if (!this.isImportableMessage(msg)) continue;

      const messageUid = await this.importOneMessage(
        msg,
        userEmail,
        userName,
        sessionId,
        conversationId,
        inboxId,
        options.skipAttachments,
      );

      if (messageUid) {
        messageIds.push(messageUid);

        if (!conversationId) {
          // Resolve the conversation ID from the first imported message so we
          // can thread all subsequent messages into the same conversation.
          conversationId = await this.resolveConversationId(messageUid);
          if (conversationId) {
            logger.log(`Resolved conversation ${conversationId} for session ${sessionId}`);
          }
        }
      }
    }

    if (!conversationId) {
      logger.warn(`No importable messages in session ${sessionId} — skipping`);
      return { conversationId: '', messageIds: [], commentIds: [] };
    }

    // Import Crisp admin notes as private Front comments.
    const commentIds: string[] = [];
    if (!options.skipNotes && notes.length > 0) {
      for (const note of notes) {
        try {
          const commentId = await this.addComment(conversationId, note);
          if (commentId) commentIds.push(commentId);
        } catch (err) {
          logger.warn(
            `Failed to add note as comment on ${conversationId}: ${(err as Error).message}`,
          );
        }
      }
    }

    // Archive so it doesn't sit in active agent queues.
    try {
      await this.frontApiRequest('PATCH', `/conversations/${conversationId}`, {
        status: 'archived',
      });
    } catch (err) {
      logger.warn(`Failed to archive ${conversationId}: ${(err as Error).message}`);
    }

    logger.log(
      `Imported session ${sessionId} → ${conversationId} ` +
        `(${messageIds.length} messages, ${commentIds.length} comments)`,
    );

    return { conversationId, messageIds, commentIds };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async importOneMessage(
    msg: CrispMessage,
    userEmail: string,
    userName: string,
    sessionId: string,
    conversationId: string | undefined,
    inboxId: string,
    skipAttachments: boolean,
  ): Promise<string | undefined> {
    const isInbound = msg.from === 'user';
    const createdAt = Math.floor((msg.timestamp || Date.now()) / 1000);
    const externalId = `crisp-${sessionId}-${msg.fingerprint ?? msg.timestamp ?? Math.random()}`;

    const sender = isInbound
      ? { handle: userEmail, name: userName }
      : { handle: SUPPORT_SENDER_HANDLE, name: this.resolveOperatorName(msg) };

    const to = isInbound ? [] : [{ handle: userEmail, name: userName }];

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
      metadata: { is_inbound: isInbound, is_archived: true, should_skip_rules: true },
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
    to: Array<{ handle: string; name: string }>,
    externalId: string,
    createdAt: number,
    isInbound: boolean,
    conversationId: string | undefined,
    inboxId: string,
  ): Promise<string | undefined> {
    let fileData: { url?: string; name?: string } = {};
    try {
      fileData = JSON.parse(msg.content || '{}');
    } catch {
      logger.warn(`Could not parse file content for ${externalId}`);
      return undefined;
    }
    if (!fileData.url) return undefined;

    // Attempt to download and re-upload. If the Crisp CDN URL has expired,
    // fall back to a text message containing the original link.
    let fileBuffer: Buffer | undefined;
    let contentType: string | undefined;
    try {
      const dl = await this.downloadFile(fileData.url);
      fileBuffer = dl.buffer;
      contentType = dl.contentType;
    } catch (err) {
      logger.warn(
        `Attachment download failed (${fileData.url}): ${(err as Error).message} — importing as link`,
      );
    }

    if (!fileBuffer) {
      const body = `📎 [${fileData.name || 'Attachment'}](${fileData.url})`;
      const payload: Record<string, unknown> = {
        sender,
        to,
        body,
        body_format: 'markdown',
        external_id: externalId,
        created_at: createdAt,
        metadata: { is_inbound: isInbound, is_archived: true, should_skip_rules: true },
      };
      if (conversationId) payload.conversation_id = conversationId;
      const r = (await this.frontApiRequest(
        'POST',
        `/inboxes/${inboxId}/imported_messages`,
        payload,
      )) as FrontImportAccepted;
      return r.message_uid;
    }

    const form = new FormData();
    form.append('sender[handle]', sender.handle);
    form.append('sender[name]', sender.name);
    to.forEach((t, i) => {
      form.append(`to[${i}][handle]`, t.handle);
      form.append(`to[${i}][name]`, t.name);
    });
    form.append('body', fileData.name || 'Attachment');
    form.append('body_format', 'markdown');
    form.append('external_id', externalId);
    form.append('created_at', String(createdAt));
    form.append('metadata[is_inbound]', String(isInbound));
    form.append('metadata[is_archived]', 'true');
    form.append('metadata[should_skip_rules]', 'true');
    if (conversationId) form.append('conversation_id', conversationId);
    form.append(
      'attachments',
      new Blob([new Uint8Array(fileBuffer)], { type: contentType }),
      fileData.name || 'attachment',
    );

    const response = await fetch(`${FRONT_API_BASE_URL}/inboxes/${inboxId}/imported_messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${frontChatApiToken}` },
      body: form,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Front file import failed (${response.status}): ${errBody}`);
    }

    const data = (await response.json()) as FrontImportAccepted;
    return data.message_uid;
  }

  /**
   * Resolve a conversation ID from a message_uid.
   *
   * Front's import endpoint is async — it returns 202 with a message_uid, and
   * the conversation_id must be looked up separately, exactly like the live
   * channel flow in FrontChatService.scheduleConversationIdResolution.
   */
  private async resolveConversationId(messageUid: string): Promise<string | undefined> {
    await this.delay(2000);
    try {
      const message = (await this.frontApiRequest(
        'GET',
        `/messages/alt:uid:${messageUid}`,
      )) as FrontMessageWithLinks;

      const conversationUrl = message._links?.related?.conversation;
      return conversationUrl?.split('/').pop();
    } catch (err) {
      logger.warn(
        `Could not resolve conversation ID for ${messageUid}: ${(err as Error).message}`,
      );
      return undefined;
    }
  }

  private async addComment(conversationId: string, note: CrispNote): Promise<string | undefined> {
    const body = note.content?.trim();
    if (!body) return undefined;

    const authorLabel = note.user?.nickname ? ` (${note.user.nickname})` : '';
    const timestamp = note.timestamp
      ? new Date(note.timestamp * 1000).toISOString()
      : new Date().toISOString();

    const commentBody = `**[Crisp Admin Note${authorLabel} — ${timestamp}]**\n\n${body}`;

    const result = (await this.frontApiRequest('POST', `/conversations/${conversationId}/comments`, {
      body: commentBody,
    })) as { id?: string };

    logger.log(`Added comment to ${conversationId}`);
    return result.id;
  }

  private resolveOperatorName(msg: CrispMessage): string {
    return msg.user?.nickname || SUPPORT_SENDER_NAME;
  }

  private extractMessageText(msg: CrispMessage): string {
    if (msg.type === 'text') return msg.content?.trim() || '';
    if (msg.type === 'picker') {
      try {
        const parsed = JSON.parse(msg.content || '{}') as {
          text?: string;
          choices?: Array<{ label?: string }>;
        };
        const choices = (parsed.choices || []).map((c) => `- ${c.label}`).join('\n');
        return [parsed.text, choices].filter(Boolean).join('\n');
      } catch {
        return msg.content?.trim() || '';
      }
    }
    return msg.content?.trim() || '';
  }

  private isImportableMessage(msg: CrispMessage): boolean {
    if (msg.automated) return false;
    if (msg.type === 'note') return false;
    if (!msg.content && msg.type !== 'file') return false;
    return true;
  }

  private async downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') || 'application/octet-stream',
    };
  }

  private async frontApiRequest(method: string, path: string, body?: unknown): Promise<unknown> {
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
      const err = new Error(
        `Front API ${method} ${path} failed (${response.status}): ${errBody}`,
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
