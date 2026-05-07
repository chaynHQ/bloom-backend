import { createHash, createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import {
  frontAppUid,
  frontChannelId,
  frontChannelSigningSecret,
  frontChatApiToken,
  frontContactListId,
  frontSupportEmail,
} from 'src/utils/constants';
import { ConversationMigrationData, CrispMessage, CrispNote } from './crisp-migration.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontImportService');

const INTER_MESSAGE_DELAY_MS = 200;
const MAX_RETRIES = 3;
// Front rejects requests above 25MB total; cap a bit lower for headroom on metadata + boundary.
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

const SUPPORT_SENDER_NAME = 'Bloom Support';

interface ImportedConversationResult {
  conversationId: string;
  messageIds: string[];
  commentIds: string[];
}

// 202 Accepted response from POST /channels/{id}/inbound_messages or /outbound_messages
interface FrontChannelAccepted {
  status?: string;
  message_uid?: string;
}

// GET /messages/alt:uid:{uid} — used to resolve the conversation ID
interface FrontMessageWithLinks {
  _links?: { related?: { conversation?: string } };
}

@Injectable()
export class FrontImportService {
  private resolvedTeammateId: string | null | undefined;

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
      userId?: string;
    },
  ): Promise<ImportedConversationResult> {
    const { sessionId, email, name, messages, notes } = data;
    const { userId } = options;

    if (options.dryRun) {
      logger.log(`[DRY RUN] Would import conversation ${sessionId} (${messages.length} messages)`);
      return { conversationId: `dry-run-${sessionId}`, messageIds: [], commentIds: [] };
    }

    if (!frontChannelId) {
      throw new Error('FRONT_CHANNEL_ID is not set.');
    }

    logger.log(
      `Importing ${sessionId} — ${messages.length} messages, ${notes.length} notes` +
        (userId ? ` [thread: bloom-user-${userId}]` : ''),
    );

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
    let conversationId: string | undefined;
    let lastMessageUid: string | undefined;

    for (const msg of sorted) {
      if (!this.isImportableMessage(msg)) continue;

      const messageUid = await this.importOneMessage(
        msg,
        userEmail,
        userName,
        sessionId,
        options.skipAttachments,
        userId,
      );

      if (messageUid) {
        messageIds.push(messageUid);
        lastMessageUid = messageUid;

        if (!conversationId) {
          conversationId = await this.resolveConversationId(messageUid);
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
        `Imported ${messageIds.length} message(s) for session ${sessionId} but could not resolve conversation ID`,
      );
      return { conversationId: '', messageIds, commentIds: [] };
    }

    const commentIds: string[] = [];
    if (!options.skipNotes && notes.length > 0) {
      // Front comments have no native dedup key, so re-runs would duplicate notes. Fetch any
      // existing comment bodies once and skip notes whose computed body already exists.
      const existingBodies = await this.getExistingCommentBodies(conversationId);
      const sortedNotes = [...notes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      for (const note of sortedNotes) {
        const commentBody = this.buildCommentBody(note);
        if (!commentBody || existingBodies.has(commentBody)) continue;
        try {
          const commentId = await this.addComment(conversationId, note, commentBody);
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
    skipAttachments: boolean,
    userId?: string,
  ): Promise<string | undefined> {
    const isInbound = msg.from === 'user';
    const deliveredAt = Math.floor((msg.timestamp || Date.now()) / 1000);
    // fingerprint/timestamp are stable across re-runs; fall back to a content hash so
    // re-running the migration is idempotent for messages missing both identifiers.
    const idSeed = msg.fingerprint ?? msg.timestamp ?? this.hashMessageContent(msg);
    const externalId = `crisp-${sessionId}-${idSeed}`;
    const threadRef = userId ? `bloom-user-${userId}` : `crisp-session-${sessionId}`;

    if (msg.type === 'file' && !skipAttachments) {
      return this.importFileMessage(
        msg,
        userEmail,
        userName,
        externalId,
        deliveredAt,
        threadRef,
        isInbound,
      );
    }

    const body = this.extractMessageText(msg);
    if (!body) return undefined;

    return this.postSyncMessage({
      isInbound,
      userEmail,
      userName,
      operatorName: this.resolveOperatorName(msg),
      body,
      deliveredAt,
      externalId,
      threadRef,
    });
  }

  private async importFileMessage(
    msg: CrispMessage,
    userEmail: string,
    userName: string,
    externalId: string,
    deliveredAt: number,
    threadRef: string,
    isInbound: boolean,
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
    const fileType = fileData.type || 'application/octet-stream';
    const isImage =
      fileData.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName);

    // Try to upload the binary so Front (and the live-chat widget which proxies through Front)
    // renders a real attachment. The legacy /imported_messages endpoint expanded markdown image
    // links into attachments automatically; the sync endpoints don't, so a markdown body shows
    // up as plain text. Falling back to a markdown link only on fetch/upload failure.
    const buffer = await this.fetchCrispAttachment(fileData.url, fileName);

    if (buffer) {
      try {
        return await this.postSyncMessageWithAttachment({
          isInbound,
          userEmail,
          userName,
          operatorName: this.resolveOperatorName(msg),
          fileName,
          fileType,
          fileBuffer: buffer,
          deliveredAt,
          externalId,
          threadRef,
        });
      } catch (err) {
        logger.warn(
          `Attachment upload failed for ${fileName}, falling back to markdown link: ${(err as Error).message}`,
        );
      }
    }

    const body = isImage
      ? `![${fileName}](${fileData.url})`
      : `📎 [${fileName}](${fileData.url})`;

    return this.postSyncMessage({
      isInbound,
      userEmail,
      userName,
      operatorName: this.resolveOperatorName(msg),
      body,
      deliveredAt,
      externalId,
      threadRef,
    });
  }

  // Crisp attachments live on a public CDN (storage.crisp.chat) — no auth needed. Returns null
  // on any failure so the caller can fall back to a markdown link without aborting the message.
  private async fetchCrispAttachment(url: string, fileName: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.warn(`Crisp attachment fetch failed (${response.status}) for ${fileName}`);
        return null;
      }
      const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
      if (contentLength > MAX_ATTACHMENT_BYTES) {
        logger.warn(
          `Skipping attachment ${fileName} — ${contentLength} bytes exceeds Front's 25MB limit`,
        );
        return null;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        logger.warn(
          `Skipping attachment ${fileName} — ${buffer.length} bytes exceeds Front's 25MB limit`,
        );
        return null;
      }
      return buffer;
    } catch (err) {
      logger.warn(`Crisp attachment fetch errored for ${fileName}: ${(err as Error).message}`);
      return null;
    }
  }

  // Multipart variant of postSyncMessage. Cannot reuse frontApiRequest because that path always
  // sets Content-Type: application/json — multipart needs the boundary set by FormData itself.
  private async postSyncMessageWithAttachment(args: {
    isInbound: boolean;
    userEmail: string;
    userName: string;
    operatorName: string;
    fileName: string;
    fileType: string;
    fileBuffer: Buffer;
    deliveredAt: number;
    externalId: string;
    threadRef: string;
  }): Promise<string | undefined> {
    const path = args.isInbound
      ? `/channels/${frontChannelId}/inbound_messages`
      : `/channels/${frontChannelId}/outbound_messages`;

    const form = new FormData();

    if (args.isInbound) {
      form.append('sender[handle]', args.userEmail);
      if (args.userName) form.append('sender[name]', args.userName);
    } else {
      form.append('to[0][handle]', args.userEmail);
      if (args.userName) form.append('to[0][name]', args.userName);
      form.append('sender_name', args.operatorName);
      const authorId = await this.getSupportTeammateId();
      if (authorId) form.append('author_id', authorId);
    }

    // Front renders the attachment alongside the body; using the filename as body keeps the
    // conversation readable when the attachment fails to render (rare, but possible).
    form.append('body', args.fileName);
    form.append('body_format', 'markdown');
    form.append('delivered_at', String(args.deliveredAt));
    form.append('metadata[external_id]', args.externalId);
    form.append('metadata[external_conversation_id]', args.threadRef);
    form.append('metadata[thread_ref]', args.threadRef);

    const blob = new Blob([new Uint8Array(args.fileBuffer)], { type: args.fileType });
    form.append('attachments', blob, args.fileName);

    const result = await this.frontFormDataRequest(path, form);
    return result.message_uid;
  }

  private async frontFormDataRequest(
    path: string,
    form: FormData,
    attempt = 0,
  ): Promise<FrontChannelAccepted> {
    const response = await fetch(`${FRONT_API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: this.getAuthHeader(path) },
      body: form,
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryMs = this.parseRetryDelayMs(errBody) ?? 500;
        logger.warn(
          `Rate limited on POST ${path} — retrying in ${retryMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await this.delay(retryMs + 50);
        return this.frontFormDataRequest(path, form, attempt + 1);
      }
      const err = new Error(
        `Front API POST ${path} failed (${response.status}): ${errBody}`,
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    return (await response.json()) as FrontChannelAccepted;
  }

  // Sync endpoints (vs /incoming_messages live endpoint) accept delivered_at at the top level,
  // which is what backdates the message timestamp shown in the Front conversation.
  // Inbound (user) → /inbound_messages with sender handle = user email.
  // Outbound (operator) → /outbound_messages attributed to the FRONT_SUPPORT_EMAIL teammate so
  // the message renders on the agent side as if the teammate sent it. external_conversation_id
  // is required by sync endpoints and groups all messages for a user (or session, for non-DB
  // users) into the same conversation; thread_ref is sent alongside so it matches the live
  // chat threading on /incoming_messages where Front honours that field instead.
  private async postSyncMessage(args: {
    isInbound: boolean;
    userEmail: string;
    userName: string;
    operatorName: string;
    body: string;
    deliveredAt: number;
    externalId: string;
    threadRef: string;
  }): Promise<string | undefined> {
    const {
      isInbound,
      userEmail,
      userName,
      operatorName,
      body,
      deliveredAt,
      externalId,
      threadRef,
    } = args;

    const threadingMetadata = {
      external_id: externalId,
      external_conversation_id: threadRef,
      thread_ref: threadRef,
    };

    if (isInbound) {
      const payload: Record<string, unknown> = {
        sender: { handle: userEmail, name: userName },
        body,
        body_format: 'markdown',
        delivered_at: deliveredAt,
        metadata: threadingMetadata,
      };
      const response = (await this.frontApiRequest(
        'POST',
        `/channels/${frontChannelId}/inbound_messages`,
        payload,
      )) as FrontChannelAccepted;
      return response.message_uid;
    }

    const authorId = await this.getSupportTeammateId();
    const payload: Record<string, unknown> = {
      to: [{ handle: userEmail, name: userName }],
      sender_name: operatorName,
      body,
      body_format: 'markdown',
      delivered_at: deliveredAt,
      metadata: threadingMetadata,
    };
    if (authorId) payload.author_id = authorId;

    const response = (await this.frontApiRequest(
      'POST',
      `/channels/${frontChannelId}/outbound_messages`,
      payload,
    )) as FrontChannelAccepted;
    return response.message_uid;
  }

  // Cached: a Crisp migration imports thousands of operator messages and the teammate ID never
  // changes during a run. null = looked up but not found, so we don't retry.
  private async getSupportTeammateId(): Promise<string | null> {
    if (this.resolvedTeammateId !== undefined) return this.resolvedTeammateId;
    if (!frontSupportEmail) {
      this.resolvedTeammateId = null;
      return null;
    }
    try {
      const teammate = (await this.frontApiRequest(
        'GET',
        `/teammates/alt:email:${encodeURIComponent(frontSupportEmail)}`,
      )) as { id: string };
      this.resolvedTeammateId = teammate.id;
      logger.log(`Resolved Front teammate for ${frontSupportEmail} → ${teammate.id}`);
      return this.resolvedTeammateId;
    } catch (err) {
      logger.warn(
        `Could not resolve Front teammate for ${frontSupportEmail}: ${(err as Error).message} — outbound messages will be unattributed`,
      );
      this.resolvedTeammateId = null;
      return null;
    }
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

  private async resolveConversationId(messageUid: string): Promise<string | undefined> {
    // Front processes channel messages asynchronously; poll until the message is visible.
    // The contact-based fallback in CrispMigrationService.migrateUser handles cases where
    // this still times out, so the migration itself is no longer blocked on resolution here.
    const delays = [1500, 2500, 4000, 6000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      await this.delay(delays[attempt]);
      try {
        const message = (await this.frontApiRequest(
          'GET',
          `/messages/alt:uid:${messageUid}`,
        )) as FrontMessageWithLinks;
        const conversationUrl = message._links?.related?.conversation;
        if (conversationUrl) return conversationUrl.split('/').pop();
      } catch (err) {
        const isNotFound = (err as { status?: number }).status === 404;
        if (!isNotFound || attempt === delays.length - 1) {
          logger.warn(
            `Could not resolve conversation ID for ${messageUid}: ${(err as Error).message}`,
          );
          return undefined;
        }
        logger.log(`Message ${messageUid} not yet available, retrying (attempt ${attempt + 1})…`);
      }
    }
    return undefined;
  }

  private buildCommentBody(note: CrispNote): string {
    const body = note.content?.trim();
    if (!body) return '';

    const authorLabel = note.user?.nickname ? ` (${note.user.nickname})` : '';
    const dateLabel = note.timestamp
      ? ` on ${new Date(note.timestamp).toISOString().replace('T', ' ').slice(0, 16)} UTC`
      : '';

    return `**[Crisp Admin Note made by${authorLabel}${dateLabel}]**\n\n${body}`;
  }

  // Comments don't accept external_id, so dedup re-runs by comparing computed bodies against
  // the conversation's existing comments. One GET per conversation per migration run.
  private async getExistingCommentBodies(conversationId: string): Promise<Set<string>> {
    const bodies = new Set<string>();
    try {
      const result = (await this.frontApiRequest(
        'GET',
        `/conversations/${conversationId}/comments?limit=100`,
      )) as { _results?: Array<{ body?: string }> };
      for (const c of result._results ?? []) {
        if (c.body) bodies.add(c.body);
      }
    } catch (err) {
      logger.warn(
        `Could not list existing comments on ${conversationId}: ${(err as Error).message} — proceeding without dedup`,
      );
    }
    return bodies;
  }

  private async addComment(
    conversationId: string,
    note: CrispNote,
    commentBody: string,
  ): Promise<string | undefined> {
    if (!commentBody) return undefined;

    const payload: Record<string, unknown> = { body: commentBody };

    // Front's comment API does not officially document backdating, but accepts these fields
    // on other write paths (sync messages); send them so the comment timestamp reflects the
    // original Crisp note time when honoured. The body header above is the guaranteed fallback.
    if (note.timestamp) {
      const seconds = Math.floor(note.timestamp / 1000);
      payload.posted_at = seconds;
      payload.created_at = seconds;
    }

    const result = (await this.frontApiRequest(
      'POST',
      `/conversations/${conversationId}/comments`,
      payload,
    )) as { id?: string };

    logger.log(`Added comment to ${conversationId}`);
    return result.id;
  }

  private resolveOperatorName(msg: CrispMessage): string {
    return msg.user?.nickname || SUPPORT_SENDER_NAME;
  }

  private hashMessageContent(msg: CrispMessage): string {
    const content =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
          ? JSON.stringify(msg.content)
          : '';
    return createHash('sha1').update(`${msg.from}|${msg.type}|${content}`).digest('hex').slice(0, 16);
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

  // Channel API requires a short-lived HS256 JWT signed with the app channel secret.
  // Regular Front API endpoints use the static API token.
  private getAuthHeader(path: string): string {
    if (path.includes('/inbound_messages') || path.includes('/outbound_messages')) {
      if (!frontAppUid) throw new Error('FRONT_APP_UID is not set.');
      if (!frontChannelSigningSecret) throw new Error('FRONT_CHANNEL_SIGNING_SECRET is not set.');

      const header = this.base64url(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
      const payload = this.base64url(
        JSON.stringify({
          iss: frontAppUid,
          jti: randomUUID(),
          sub: frontChannelId,
          exp: Math.floor(Date.now() / 1000) + 10,
        }),
      );
      const signingInput = `${header}.${payload}`;
      const signature = createHmac('sha256', frontChannelSigningSecret)
        .update(signingInput)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      return `Bearer ${signingInput}.${signature}`;
    }
    return `Bearer ${frontChatApiToken}`;
  }

  private base64url(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
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
        Authorization: this.getAuthHeader(path),
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
