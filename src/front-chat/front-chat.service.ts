import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import {
  FRONT_API_BASE_URL,
  FRONT_SEND_RETRY_DELAYS_MS,
  frontChannelId,
  frontChatApiToken,
  frontContactListId,
} from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import { ILike, Repository } from 'typeorm';
import {
  buildThreadRef,
  getContactAlias,
  isAllowedS3RedirectTarget,
  mapFrontMessageToHistory,
  normalizeFrontAttachmentUrl,
  serializeCustomFields,
} from './front-chat.helpers';
import {
  ChatHistoryMessage,
  FrontApiMessage,
  FrontApiMessageLinks,
  FrontApiPaginated,
  FrontChatContactCustomFields,
  FrontChatContactProfile,
  FrontChatUser,
} from './front-chat.interface';

const logger = new Logger('FrontChatService');

// Re-export so existing consumers keep importing from this module.
export { ChatHistoryMessage } from './front-chat.interface';
export { buildThreadRef } from './front-chat.helpers';

// ── Front HTTP client ──────────────────────────────────────────────────────────
// Module-level so they're reused without `this` and unit-testable in isolation.

type FrontApiError = Error & { status?: number };

// Retries 429/5xx for message-send paths so a transient Front error doesn't surface
// as a lost user message. Not used for one-shot reads.
async function fetchFrontWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init);
    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable || attempt >= FRONT_SEND_RETRY_DELAYS_MS.length) return response;
    logger.warn(`Front API ${response.status} — retrying (attempt ${attempt + 1})`);
    await new Promise((resolve) => setTimeout(resolve, FRONT_SEND_RETRY_DELAYS_MS[attempt]));
  }
}

async function frontApiRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${FRONT_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${frontChatApiToken}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(
      `Front API ${method} ${path} failed (${response.status}): ${errorBody}`,
    ) as FrontApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

// Fetches a Front attachment via the proxy. The URL is rebuilt from a hardcoded
// template before any network call (see normalizeFrontAttachmentUrl) — that's the
// SSRF defence: the URL handed to fetch contains only string literals + regex-
// extracted IDs from the input.
//
// Uses redirect: 'manual' so we can capture the Location header without following
// it: Front's download URLs redirect to S3 presigned URLs which reject an
// Authorization header alongside their own query-string signature. The redirect
// target is independently validated against the AWS S3 host allowlist before we
// follow it.
export async function fetchFrontAttachment(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const safeUrl = normalizeFrontAttachmentUrl(url);
  if (!safeUrl) {
    throw new Error('Invalid attachment URL');
  }

  const initial = await fetch(safeUrl, {
    redirect: 'manual',
    headers: { Authorization: `Bearer ${frontChatApiToken}` },
  });

  if (initial.ok) {
    const contentType = initial.headers.get('content-type') ?? 'application/octet-stream';
    return { buffer: Buffer.from(await initial.arrayBuffer()), contentType };
  }

  if (initial.status >= 300 && initial.status < 400) {
    const location = initial.headers.get('location');
    if (!location || !isAllowedS3RedirectTarget(location)) {
      throw new Error('Disallowed redirect target');
    }
    const cdnResponse = await fetch(location);
    if (cdnResponse.ok) {
      const contentType = cdnResponse.headers.get('content-type') ?? 'application/octet-stream';
      return { buffer: Buffer.from(await cdnResponse.arrayBuffer()), contentType };
    }
    throw new Error(`CDN fetch failed (${cdnResponse.status})`);
  }

  throw new Error(`Front attachment fetch failed (${initial.status})`);
}

function isFrontContactNotFound(error: unknown): boolean {
  const status = (error as FrontApiError)?.status;
  if (status === 404) return true;
  const message = (error as Error)?.message || '';
  return message.includes('not_found');
}

@Injectable()
export class FrontChatService {
  private resolvedInboxId: string | undefined;

  constructor(
    @InjectRepository(ChatUserEntity)
    private readonly chatUserRepository: Repository<ChatUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // ── ChatUser repository ─────────────────────────────────────────────────────

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

  // Migration-only: bypass the "never overwrite frontConversationId" guard. The Crisp migration
  // is authoritative for that user — if a stale ID was saved earlier (e.g. by a prior migration
  // run or by the live chat before history existed), we want the freshly-resolved one to win.
  async setMigratedConversationId(userId: string, conversationId: string): Promise<void> {
    const chatUser = await this.getOrCreateChatUser(userId);
    if (chatUser.frontConversationId === conversationId) return;
    await this.chatUserRepository.save({ ...chatUser, frontConversationId: conversationId });
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

  async getUsersWithUnreadMessages(): Promise<{ chatUser: ChatUserEntity; email: string }[]> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const rows = await this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoinAndSelect('cu.user', 'u')
      .where('cu.lastMessageReceivedAt IS NOT NULL')
      .andWhere('cu.lastMessageReceivedAt < :cutoff', { cutoff })
      .andWhere('(cu.lastMessageReadAt IS NULL OR cu.lastMessageReadAt < cu.lastMessageReceivedAt)')
      .andWhere(
        '(cu.lastUnreadNotifiedAt IS NULL OR cu.lastUnreadNotifiedAt < cu.lastMessageReceivedAt)',
      )
      .getMany();

    return rows.map((cu) => ({ chatUser: cu, email: cu.user.email }));
  }

  async markUnreadNotified(chatUserId: string): Promise<void> {
    await this.chatUserRepository.update({ id: chatUserId }, { lastUnreadNotifiedAt: new Date() });
  }

  async markAsRead(userId: string): Promise<ChatUserEntity | null> {
    const chatUser = await this.chatUserRepository.findOneBy({ userId });
    if (!chatUser) return null;

    // Nothing to mark as read if the agent has never sent a message.
    if (!chatUser.lastMessageReceivedAt) return null;

    // Already up to date — don't write or sync unnecessarily.
    if (chatUser.lastMessageReadAt && chatUser.lastMessageReadAt >= chatUser.lastMessageReceivedAt) {
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

  // ── Sending messages to Front (Channel API) ─────────────────────────────────

  async sendChannelTextMessage(
    user: FrontChatUser,
    text: string,
    existingChatUser?: ChatUserEntity | null,
  ): Promise<ChatUserEntity | null> {
    if (isCypressTestEmail(user.email)) {
      logger.log('Skipping Front message send for Cypress test user');
      return null;
    }

    const body = {
      sender: { handle: user.email, ...(user.name && { name: user.name }) },
      body: text,
      body_format: 'markdown',
      metadata: {
        external_id: `${user.id}-${Date.now()}`,
        thread_ref: buildThreadRef(user.id),
      },
    };

    const response = await fetchFrontWithRetry(
      `${FRONT_API_BASE_URL}/channels/${frontChannelId}/incoming_messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${frontChatApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Front incoming_messages failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { message_uid?: string };
    return this.recordMessageSent(user.id, data.message_uid, existingChatUser);
  }

  async sendChannelAttachment(
    user: FrontChatUser,
    file: Express.Multer.File,
  ): Promise<ChatUserEntity | null> {
    if (isCypressTestEmail(user.email)) {
      logger.log('Skipping Front attachment send for Cypress test user');
      return null;
    }

    const form = new FormData();
    form.append('sender[handle]', user.email);
    if (user.name) form.append('sender[name]', user.name);
    form.append('body', file.mimetype.startsWith('audio/') ? 'Voice note' : file.originalname);
    form.append('body_format', 'markdown');
    form.append('metadata[external_id]', `${user.id}-${Date.now()}`);
    form.append('metadata[thread_ref]', buildThreadRef(user.id));
    form.append(
      'attachments',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );

    // No retry for FormData uploads — undici consumes the body on the first fetch
    // and a retry would send an empty body. Attachments are rare; users can re-upload.
    const response = await fetch(
      `${FRONT_API_BASE_URL}/channels/${frontChannelId}/incoming_messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${frontChatApiToken}` },
        body: form,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Front attachment upload failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { message_uid?: string };
    return this.recordMessageSent(user.id, data.message_uid);
  }

  // Awaits the save so the returned chatUser has lastMessageSentAt set — callers use it
  // directly for Mailchimp sync to avoid a race condition on the subsequent DB fetch.
  private async recordMessageSent(
    userId: string,
    messageUid: string | undefined,
    existingChatUser?: ChatUserEntity | null,
  ): Promise<ChatUserEntity> {
    const chatUser = existingChatUser ?? (await this.getOrCreateChatUser(userId));
    const saved = await this.chatUserRepository.save({
      ...chatUser,
      lastMessageSentAt: new Date(),
    });

    if (messageUid) {
      this.scheduleConversationIdResolution(userId, messageUid);
    }

    return saved;
  }

  private scheduleConversationIdResolution(userId: string, messageUid: string): void {
    const timer = setTimeout(() => {
      this.resolveAndSaveConversationId(userId, messageUid).catch((err) => {
        logger.warn(
          `Background conversation ID resolution failed for user ${userId}: ${err?.message || 'unknown'}`,
        );
      });
    }, 5000);
    timer.unref();
  }

  private async resolveAndSaveConversationId(userId: string, messageUid: string): Promise<void> {
    const chatUser = await this.chatUserRepository.findOneBy({ userId });
    if (chatUser?.frontConversationId) return;

    const message = (await frontApiRequest(
      'GET',
      `/messages/alt:uid:${messageUid}`,
    )) as FrontApiMessageLinks;

    const conversationUrl = message._links?.related?.conversation;
    if (!conversationUrl) return;

    const conversationId = conversationUrl.split('/').pop();
    if (conversationId) {
      await this.getOrCreateChatUser(userId, { frontConversationId: conversationId });
      logger.log(`Resolved conversation ID ${conversationId} for user ${userId}`);
    }
  }

  // ── Conversation history ────────────────────────────────────────────────────

  async getConversationHistory(
    user: FrontChatUser,
  ): Promise<{ messages: ChatHistoryMessage[]; conversationFound: boolean }> {
    if (isCypressTestEmail(user.email)) return { messages: [], conversationFound: false };

    const chatUser = await this.chatUserRepository.findOneBy({ userId: user.id });

    let conversationId = chatUser?.frontConversationId ?? null;
    if (!conversationId) {
      // handles users who predate local conversation ID tracking
      conversationId = await this.findConversationIdByContact(user.id, user.email);
      if (!conversationId) return { messages: [], conversationFound: false };
    }

    const allMessages: ChatHistoryMessage[] = [];
    let nextPath: string | null = `/conversations/${conversationId}/messages?limit=100`;

    while (nextPath) {
      let page: FrontApiPaginated<FrontApiMessage>;
      try {
        page = (await frontApiRequest('GET', nextPath)) as FrontApiPaginated<FrontApiMessage>;
      } catch (error) {
        if ((error as { status?: number })?.status === 404) {
          // Stale conversation ID — clear it so the next connection tries a fresh lookup.
          await this.chatUserRepository.update({ userId: user.id }, { frontConversationId: null });
          logger.warn(`Cleared stale conversation ${conversationId} for user ${user.id}`);
          return { messages: allMessages, conversationFound: false };
        }
        throw new Error(
          `Fetch Front messages failed: ${(error as Error)?.message || 'unknown error'}`,
          { cause: error },
        );
      }

      for (const m of page._results ?? []) {
        const histMsg = mapFrontMessageToHistory(m);
        if (histMsg) allMessages.push(histMsg);
      }

      const nextUrl = page._pagination?.next;
      nextPath = nextUrl ? nextUrl.replace(FRONT_API_BASE_URL, '') : null;
    }

    return {
      messages: allMessages.sort((a, b) => a.createdAt - b.createdAt),
      conversationFound: true,
    };
  }

  // Public so the Crisp migration can fall back to a contact-based lookup when its in-flight
  // resolveConversationId polling times out — the conversation exists in Front but
  // /messages/alt:uid:{uid} hasn't become consistent within the polling window yet.
  async findConversationIdByContact(userId: string, email: string): Promise<string | null> {
    try {
      const inboxId = await this.getInboxId();
      if (!inboxId) return null;

      let nextPath: string | null = `/contacts/${getContactAlias(email)}/conversations?limit=50`;
      const matching: { id: string; created_at?: number }[] = [];

      while (nextPath) {
        const data = (await frontApiRequest('GET', nextPath)) as FrontApiPaginated<{
          id: string;
          created_at?: number;
          _links?: { related?: { inbox?: string } };
        }>;

        for (const c of data._results ?? []) {
          if (!c.id) continue;
          if (!c._links?.related?.inbox?.endsWith(`/${inboxId}`)) continue;
          matching.push({ id: c.id, created_at: c.created_at });
        }

        const nextUrl = data._pagination?.next;
        nextPath = nextUrl ? nextUrl.replace(FRONT_API_BASE_URL, '') : null;
      }

      const conversationId =
        matching.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]?.id ?? null;

      if (conversationId) {
        await this.getOrCreateChatUser(userId, { frontConversationId: conversationId });
        logger.log(`Resolved conversation ${conversationId} for user ${userId} via contact lookup`);
      }
      return conversationId;
    } catch {
      return null;
    }
  }

  private async getInboxId(): Promise<string | null> {
    if (this.resolvedInboxId) return this.resolvedInboxId;
    if (!frontChannelId) return null;
    try {
      const channel = (await frontApiRequest('GET', `/channels/${frontChannelId}`)) as {
        _links?: { related?: { inbox?: string } };
      };
      const inboxUrl = channel._links?.related?.inbox;
      if (!inboxUrl) return null;
      this.resolvedInboxId = inboxUrl.split('/').pop()!;
      return this.resolvedInboxId;
    } catch {
      return null;
    }
  }

  // ── Contact API ─────────────────────────────────────────────────────────────

  async contactExists(email: string): Promise<boolean> {
    if (isCypressTestEmail(email)) return true;
    try {
      await frontApiRequest('GET', `/contacts/${getContactAlias(email)}`);
      return true;
    } catch (error) {
      if (isFrontContactNotFound(error)) return false;
      throw error;
    }
  }

  async createContact(
    profile: FrontChatContactProfile & {
      customFields?: FrontChatContactCustomFields;
      userId?: string;
    },
  ) {
    const { email, name, customFields, userId } = profile;

    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact creation for Cypress test email');
      return null;
    }

    let contact: { id: string } & Record<string, unknown>;
    try {
      contact = (await frontApiRequest('POST', '/contacts', {
        // 'email' handle for REST API lookups; 'custom' handle so Channel API messages
        // (source type used by Application Channels) are linked to this contact instead
        // of creating a separate auto-contact.
        handles: [
          { source: 'email', handle: email },
          { source: 'custom', handle: email },
        ],
        ...(name && { name }),
        ...(customFields && { custom_fields: serializeCustomFields(customFields) }),
      })) as { id: string } & Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Create Front Chat contact API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }

    await this.addToFrontContactList(email, contact.id);

    if (userId) {
      await this.getOrCreateChatUser(userId, { frontContactId: contact.id });
    }

    return contact;
  }

  async updateContactProfile(profile: FrontChatContactProfile, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact profile update for Cypress test email');
      return null;
    }

    const contactId = getContactAlias(email);
    const updateBody: Record<string, unknown> = {};
    if (profile.name) updateBody.name = profile.name;
    if (profile.email && profile.email !== email) {
      updateBody.handles = [{ source: 'email', handle: profile.email }];
    }

    try {
      const result = await frontApiRequest('PATCH', `/contacts/${contactId}`, updateBody);
      await this.addToFrontContactList(profile.email ?? email);
      // When email changes, the new email handle won't have the custom channel handle yet.
      if (profile.email && profile.email !== email) {
        this.addChannelHandle(profile.email).catch(() => {});
      }
      return result;
    } catch (error) {
      // Do NOT fall back to createContact here: it would create a contact with only name/email,
      // losing all custom field data. getOrCreateFrontContact (widget open) handles backfill with
      // full data if the contact is missing.
      throw new Error(
        `Update Front Chat contact profile API call failed: ${(error as Error)?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async updateContactCustomFields(customFields: FrontChatContactCustomFields, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact custom fields update for Cypress test email');
      return null;
    }

    try {
      const contactId = getContactAlias(email);
      const result = await frontApiRequest('PATCH', `/contacts/${contactId}`, {
        custom_fields: serializeCustomFields(customFields),
      });
      await this.addToFrontContactList(email);
      return result;
    } catch (error) {
      // Do NOT fall back to createContact here — it would replace the existing record with
      // only the partial fields being updated and wipe the rest.
      throw new Error(
        `Update Front Chat contact custom fields API call failed: ${(error as Error)?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async deleteContact(email: string) {
    try {
      await frontApiRequest('DELETE', `/contacts/${getContactAlias(email)}`);
    } catch (error) {
      throw new Error(
        `Delete Front Chat contact API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  // Without the 'custom' handle, Channel API messages create a separate auto-contact
  // instead of linking to this one.
  async addChannelHandle(email: string): Promise<void> {
    if (isCypressTestEmail(email)) return;
    try {
      await frontApiRequest('PATCH', `/contacts/${getContactAlias(email)}`, {
        handles: [{ source: 'custom', handle: email }],
      });
    } catch {
      // Non-fatal: duplicate handle or contact not found
    }
  }

  // The contact_lists endpoint requires canonical contact IDs (crd_xxx), not aliases.
  // contactId can be passed directly from a create/patch response to skip the extra lookup.
  private async addToFrontContactList(email: string, contactId?: string): Promise<void> {
    if (!frontContactListId || isCypressTestEmail(email)) return;

    let resolvedId: string | undefined;
    try {
      resolvedId =
        contactId ??
        (
          (await frontApiRequest('GET', `/contacts/${getContactAlias(email)}`)) as {
            id: string;
          }
        ).id;
      await frontApiRequest('POST', `/contact_lists/${frontContactListId}/contacts`, {
        contact_ids: [resolvedId],
      });
    } catch (error) {
      logger.warn(`Front add-to-list failed for ${email}: ${error?.message || 'unknown error'}`);
    }

    // Save frontContactId even if the list-add failed — the canonical ID is still valid.
    if (resolvedId) {
      this.updateChatUserByEmail(email, { frontContactId: resolvedId }).catch(() => {});
    }
  }

  async deleteCypressFrontChatContacts() {
    // Front API does not support searching contacts by email prefix — tests call deleteContact directly.
    logger.log('Cypress Front Chat contact cleanup is handled by individual test teardown');
  }

  // ── Attachments ─────────────────────────────────────────────────────────────

  fetchAttachment(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    return fetchFrontAttachment(url);
  }

}
