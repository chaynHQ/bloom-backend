import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as https from 'https';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import { frontChannelId, frontChatApiToken, frontContactListId } from 'src/utils/constants';
import { formatAuthorName, stripHtml } from 'src/utils/html';
import { isCypressTestEmail } from 'src/utils/utils';
import { ILike, Repository } from 'typeorm';
import { FrontChatContactCustomFields, FrontChatContactProfile } from './front-chat.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontChatService');

interface FrontChatUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  direction: 'user' | 'agent';
  kind?: 'image' | 'voice';
  text: string;
  attachmentUrl?: string;
  authorName?: string;
  createdAt: number;
}

interface FrontApiPaginated<T> {
  _results: T[];
  _pagination?: { next?: string | null };
}

interface FrontApiAuthor {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface FrontApiAttachment {
  url: string;
  filename?: string;
  content_type?: string;
}

interface FrontApiMessage {
  id: string;
  is_inbound?: boolean;
  created_at?: number;
  body?: string;
  text?: string;
  author?: FrontApiAuthor | null;
  attachments?: FrontApiAttachment[];
}

interface FrontApiMessageLinks {
  _links?: { related?: { conversation?: string } };
}

// Front groups messages sharing a thread_ref into one conversation, so a stable
// per-user value gives every user a single long-running conversation.
export const buildThreadRef = (userId: string) => `bloom-user-${userId}`;

@Injectable()
export class FrontChatService {
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

    // Never overwrite an existing conversation ID with a new one
    const { frontConversationId, ...rest } = partial;
    const updates = chatUser.frontConversationId ? rest : { frontConversationId, ...rest };

    return this.chatUserRepository.save({ ...chatUser, ...updates });
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

    const { frontConversationId, ...rest } = partial;
    const updates = chatUser.frontConversationId ? rest : { frontConversationId, ...rest };

    return this.chatUserRepository.save({ ...chatUser, ...updates });
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

  async sendChannelTextMessage(user: FrontChatUser, text: string): Promise<ChatUserEntity | null> {
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

    const response = await fetch(
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

    // Await the save so the returned chatUser has lastMessageSentAt set — callers use it
    // directly for Mailchimp sync to avoid a race condition on the subsequent DB fetch.
    const now = new Date();
    const chatUser = await this.getOrCreateChatUser(user.id);
    const saved = await this.chatUserRepository.save({ ...chatUser, lastMessageSentAt: now });

    if (data.message_uid) {
      this.scheduleConversationIdResolution(user.id, data.message_uid);
    }

    return saved;
  }

  async sendChannelAttachment(user: FrontChatUser, file: Express.Multer.File): Promise<ChatUserEntity | null> {
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

    const now = new Date();
    const chatUser = await this.getOrCreateChatUser(user.id);
    const saved = await this.chatUserRepository.save({ ...chatUser, lastMessageSentAt: now });

    if (data.message_uid) {
      this.scheduleConversationIdResolution(user.id, data.message_uid);
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

    const message = (await this.frontApiRequest(
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
        page = (await this.frontApiRequest('GET', nextPath)) as FrontApiPaginated<FrontApiMessage>;
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
        const attachments = m.attachments ?? [];
        const imageAttachment = attachments.find(
          (a) => a.content_type?.startsWith('image/') && a.url,
        );
        const audioAttachment = !imageAttachment
          ? attachments.find((a) => a.content_type?.startsWith('audio/') && a.url)
          : undefined;
        const text = m.text ?? stripHtml(m.body ?? '');
        if (!text && !imageAttachment && !audioAttachment) continue;

        const histMsg: ChatHistoryMessage = {
          id: m.id,
          direction: m.is_inbound ? 'user' : 'agent',
          // Images: show filename. Voice: use message body text ("Voice note") for consistency
          // with fresh messages. Fallback to plain text for everything else.
          text: imageAttachment
            ? (imageAttachment.filename ?? 'image')
            : audioAttachment
              ? text || 'Voice note'
              : text,
          authorName: formatAuthorName(m.author ?? undefined),
          createdAt: (m.created_at ?? Date.now() / 1000) * 1000,
        };

        if (imageAttachment) {
          histMsg.kind = 'image';
          histMsg.attachmentUrl = `/front-chat/attachment-proxy?url=${encodeURIComponent(imageAttachment.url)}`;
        } else if (audioAttachment) {
          histMsg.kind = 'voice';
          histMsg.attachmentUrl = `/front-chat/attachment-proxy?url=${encodeURIComponent(audioAttachment.url)}`;
        }

        allMessages.push(histMsg);
      }

      const nextUrl = page._pagination?.next;
      nextPath = nextUrl ? nextUrl.replace(FRONT_API_BASE_URL, '') : null;
    }

    return { messages: allMessages.sort((a, b) => a.createdAt - b.createdAt), conversationFound: true };
  }

  async contactExists(email: string): Promise<boolean> {
    if (isCypressTestEmail(email)) return true;
    try {
      await this.frontApiRequest('GET', `/contacts/${this.getContactAlias(email)}`);
      return true;
    } catch (error) {
      if (this.isContactNotFoundError(error)) return false;
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
      contact = (await this.frontApiRequest('POST', '/contacts', {
        // 'email' handle for REST API lookups; 'custom' handle so Channel API messages
        // (source type used by Application Channels) are linked to this contact instead
        // of creating a separate auto-contact.
        handles: [
          { source: 'email', handle: email },
          { source: 'custom', handle: email },
        ],
        ...(name && { name }),
        ...(customFields && { custom_fields: this.serializeCustomFields(customFields) }),
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

    const contactId = this.getContactAlias(email);
    const updateBody: Record<string, unknown> = {};
    if (profile.name) updateBody.name = profile.name;
    if (profile.email && profile.email !== email) {
      updateBody.handles = [{ source: 'email', handle: profile.email }];
    }

    try {
      const result = await this.frontApiRequest('PATCH', `/contacts/${contactId}`, updateBody);
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

    const serialized = this.serializeCustomFields(customFields);

    try {
      const contactId = this.getContactAlias(email);
      const result = await this.frontApiRequest('PATCH', `/contacts/${contactId}`, {
        custom_fields: serialized,
      });
      await this.addToFrontContactList(email);
      return result;
    } catch (error) {
      // Do NOT fall back to createContact here: it would create a contact with only the
      // partial fields being updated (e.g. just chat-activity timestamps), losing all other
      // data. Contact creation with full data is handled by createServiceUserProfiles (signup)
      // and getOrCreateFrontContact (widget open). If the contact doesn't exist here, log and move on.
      throw new Error(
        `Update Front Chat contact custom fields API call failed: ${(error as Error)?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async deleteContact(email: string) {
    try {
      const contactId = this.getContactAlias(email);
      await this.frontApiRequest('DELETE', `/contacts/${contactId}`);
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
      await this.frontApiRequest('PATCH', `/contacts/${this.getContactAlias(email)}`, {
        handles: [{ source: 'custom', handle: email }],
      });
    } catch {
      // Non-fatal: duplicate handle or contact not found
    }
  }

  private async findConversationIdByContact(userId: string, email: string): Promise<string | null> {
    try {
      const data = (await this.frontApiRequest(
        'GET',
        `/contacts/${this.getContactAlias(email)}/conversations?limit=10`,
      )) as FrontApiPaginated<{ id: string; created_at?: number }>;

      const sorted = (data._results ?? [])
        .filter((c) => c.id)
        .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

      const conversationId = sorted[0]?.id ?? null;
      if (conversationId) {
        await this.getOrCreateChatUser(userId, { frontConversationId: conversationId });
        logger.log(`Resolved conversation ${conversationId} for user ${userId} via contact lookup`);
      }
      return conversationId;
    } catch {
      return null;
    }
  }

  async deleteCypressFrontChatContacts() {
    // Front API does not support searching contacts by email prefix — tests call deleteContact directly.
    logger.log('Cypress Front Chat contact cleanup is handled by individual test teardown');
  }

  private isValidFrontUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === 'https:' &&
        (parsed.hostname === 'api2.frontapp.com' || parsed.hostname.endsWith('.frontapp.com'))
      );
    } catch {
      return false;
    }
  }

  // Fetches an attachment URL with auth but without following redirects, so we can
  // capture the Location header and fetch the CDN URL separately without auth.
  // Front's download URLs redirect to S3 presigned URLs which reject an Authorization
  // header alongside their own query-string signature.
  private frontAttachmentRequest(url: string): Promise<{
    statusCode: number;
    location?: string;
    buffer?: Buffer;
    contentType?: string;
  }> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        { headers: { Authorization: `Bearer ${frontChatApiToken}` } },
        (res) => {
          const statusCode = res.statusCode ?? 0;
          if (statusCode >= 300 && statusCode < 400) {
            res.resume();
            return resolve({ statusCode, location: res.headers.location as string | undefined });
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({
              statusCode,
              buffer: Buffer.concat(chunks),
              contentType: res.headers['content-type'] as string | undefined,
            }),
          );
          res.on('error', reject);
        },
      );
      req.on('error', reject);
    });
  }

  async fetchAttachment(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.isValidFrontUrl(url)) {
      throw new Error('Invalid attachment URL');
    }

    const initial = await this.frontAttachmentRequest(url);

    if (initial.statusCode >= 200 && initial.statusCode < 300 && initial.buffer) {
      return {
        buffer: initial.buffer,
        contentType: initial.contentType ?? 'application/octet-stream',
      };
    }

    if (initial.statusCode >= 300 && initial.statusCode < 400 && initial.location) {
      const cdnResponse = await fetch(initial.location);
      if (cdnResponse.ok) {
        const contentType = cdnResponse.headers.get('content-type') ?? 'application/octet-stream';
        return { buffer: Buffer.from(await cdnResponse.arrayBuffer()), contentType };
      }
      throw new Error(`CDN fetch failed (${cdnResponse.status})`);
    }

    throw new Error(`Front attachment fetch failed (${initial.statusCode})`);
  }

  private async frontApiRequest(method: string, path: string, body?: unknown): Promise<unknown> {
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
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
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
          (await this.frontApiRequest('GET', `/contacts/${this.getContactAlias(email)}`)) as {
            id: string;
          }
        ).id;
      await this.frontApiRequest('POST', `/contact_lists/${frontContactListId}/contacts`, {
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

  private getContactAlias(email: string): string {
    return `alt:email:${encodeURIComponent(email)}`;
  }

  private isContactNotFoundError(error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 404) return true;
    const message = (error as Error)?.message || '';
    return message.includes('not_found');
  }

  private serializeCustomFields(
    fields: FrontChatContactCustomFields,
  ): Record<string, string | number | boolean> {
    const serialized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        serialized[key] = value;
      }
    }
    return serialized;
  }
}
