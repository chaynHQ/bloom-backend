import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUserEntity } from 'src/entities/chat-user.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Logger } from 'src/logger/logger';
import { frontChannelId, frontChatApiToken, frontContactListId } from 'src/utils/constants';
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

  // ── ChatUser DB operations ──────────────────────────────────────────────────

  async getOrCreateChatUser(
    userId: string,
    initial: Partial<ChatUserEntity> = {},
  ): Promise<ChatUserEntity> {
    const existing = await this.chatUserRepository.findOneBy({ userId });
    if (existing) {
      // Update any non-null initial values that aren't already set
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
    const updates = chatUser.frontConversationId
      ? rest
      : { frontConversationId, ...rest };

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
    const updates = chatUser.frontConversationId
      ? rest
      : { frontConversationId, ...rest };

    return this.chatUserRepository.save({ ...chatUser, ...updates });
  }

  async getUsersWithUnreadMessages(): Promise<{ chatUser: ChatUserEntity; email: string }[]> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const rows = await this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoinAndSelect('cu.user', 'u')
      .where('cu.lastMessageReceivedAt IS NOT NULL')
      .andWhere('cu.lastMessageReceivedAt < :cutoff', { cutoff })
      .andWhere(
        '(cu.lastMessageReadAt IS NULL OR cu.lastMessageReadAt < cu.lastMessageReceivedAt)',
      )
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
    return this.updateChatUser(userId, { lastMessageReadAt: new Date() });
  }

  // ── Front channel messaging ─────────────────────────────────────────────────

  async sendChannelTextMessage(user: FrontChatUser, text: string): Promise<void> {
    if (isCypressTestEmail(user.email)) {
      logger.log('Skipping Front message send for Cypress test user');
      return;
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

    const data = await response.json() as { message_uid?: string };

    const now = new Date();
    this.getOrCreateChatUser(user.id)
      .then((chatUser) => this.chatUserRepository.save({ ...chatUser, lastMessageSentAt: now }))
      .catch(() => {});

    if (data.message_uid) {
      this.scheduleConversationIdResolution(user.id, data.message_uid);
    }
  }

  async sendChannelAttachment(user: FrontChatUser, file: Express.Multer.File): Promise<void> {
    if (isCypressTestEmail(user.email)) {
      logger.log('Skipping Front attachment send for Cypress test user');
      return;
    }

    const form = new FormData();
    form.append('sender[handle]', user.email);
    if (user.name) form.append('sender[name]', user.name);
    form.append('body', file.mimetype.startsWith('audio/') ? 'Voice note' : 'Attachment');
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

    const data = await response.json() as { message_uid?: string };

    const now = new Date();
    this.getOrCreateChatUser(user.id)
      .then((chatUser) => this.chatUserRepository.save({ ...chatUser, lastMessageSentAt: now }))
      .catch(() => {});

    if (data.message_uid) {
      this.scheduleConversationIdResolution(user.id, data.message_uid);
    }
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

  // ── Conversation history ────────────────────────────────────────────────────

  async getConversationHistory(user: FrontChatUser): Promise<ChatHistoryMessage[]> {
    if (isCypressTestEmail(user.email)) return [];

    const chatUser = await this.chatUserRepository.findOneBy({ userId: user.id });
    if (!chatUser?.frontConversationId) return [];

    const allMessages: ChatHistoryMessage[] = [];
    let nextPath: string | null =
      `/conversations/${chatUser.frontConversationId}/messages?limit=100`;

    while (nextPath) {
      let page: FrontApiPaginated<FrontApiMessage>;
      try {
        page = (await this.frontApiRequest(
          'GET',
          nextPath,
        )) as FrontApiPaginated<FrontApiMessage>;
      } catch (error) {
        if (this.isContactNotFoundError(error)) return allMessages;
        throw new Error(
          `Fetch Front messages failed: ${(error as Error)?.message || 'unknown error'}`,
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
        const text = m.text ?? this.stripHtml(m.body ?? '');
        if (!text && !imageAttachment && !audioAttachment) continue;

        const histMsg: ChatHistoryMessage = {
          id: m.id,
          direction: m.is_inbound ? 'user' : 'agent',
          // Images: show filename. Voice: use message body text ("Voice note") for consistency
          // with fresh messages. Fallback to plain text for everything else.
          text: imageAttachment
            ? (imageAttachment.filename ?? 'image')
            : audioAttachment
              ? (text || 'Voice note')
              : text,
          authorName: this.formatAuthorName(m.author ?? undefined),
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

    logger.log(`Fetched conversation history for user ${user.id}: ${allMessages.length} messages`);
    return allMessages.sort((a, b) => a.createdAt - b.createdAt);
  }

  // ── Contact management ──────────────────────────────────────────────────────

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
        handles: [{ source: 'email', handle: email }],
        ...(name && { name }),
        ...(customFields && { custom_fields: this.serializeCustomFields(customFields) }),
      })) as { id: string } & Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Create Front Chat contact API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }

    // Pass the canonical ID from the create response to avoid an extra lookup.
    await this.ensureContactInList(email, contact.id);

    // Persist the canonical contact ID on the ChatUser record when userId is known.
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
      await this.ensureContactInList(profile.email ?? email);
      return result;
    } catch (error) {
      if (this.isContactNotFoundError(error)) {
        try {
          await this.createContact({ email, ...profile });
          return await this.frontApiRequest('PATCH', `/contacts/${this.getContactAlias(email)}`, {
            name: profile.name,
          });
        } catch {
          throw new Error(
            `Update Front Chat contact profile API call failed: ${error?.message || 'unknown error'}`,
          );
        }
      }
      throw new Error(
        `Update Front Chat contact profile API call failed: ${error?.message || 'unknown error'}`,
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
      await this.ensureContactInList(email);
      return result;
    } catch (error) {
      if (this.isContactNotFoundError(error)) {
        try {
          await this.createContact({ email, customFields });
          return await this.frontApiRequest('PATCH', `/contacts/${this.getContactAlias(email)}`, {
            custom_fields: serialized,
          });
        } catch {
          throw new Error(
            `Update Front Chat contact custom fields API call failed: ${error?.message || 'unknown error'}`,
          );
        }
      }
      throw new Error(
        `Update Front Chat contact custom fields API call failed: ${error?.message || 'unknown error'}`,
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

  async deleteCypressFrontChatContacts() {
    // Front API does not support searching contacts by email prefix.
    // Cypress test contacts are cleaned up individually via deleteContact during test teardown.
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
      const req = https.get(url, { headers: { Authorization: `Bearer ${frontChatApiToken}` } }, (res) => {
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
      });
      req.on('error', reject);
    });
  }

  async fetchAttachment(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.isValidFrontUrl(url)) {
      throw new Error('Invalid attachment URL');
    }

    const initial = await this.frontAttachmentRequest(url);

    if (initial.statusCode >= 200 && initial.statusCode < 300 && initial.buffer) {
      return { buffer: initial.buffer, contentType: initial.contentType ?? 'application/octet-stream' };
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

  // ── Private helpers ─────────────────────────────────────────────────────────

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
  private async ensureContactInList(email: string, contactId?: string): Promise<void> {
    if (!frontContactListId || isCypressTestEmail(email)) return;

    let resolvedId: string | undefined;
    try {
      resolvedId =
        contactId ??
        ((await this.frontApiRequest('GET', `/contacts/${this.getContactAlias(email)}`)) as {
          id: string;
        }).id;
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

  private formatAuthorName(author: FrontApiAuthor | undefined): string | undefined {
    if (!author) return undefined;
    const full = [author.first_name, author.last_name].filter(Boolean).join(' ').trim();
    return full || author.username || undefined;
  }

  private stripHtml(input: string): string {
    return input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
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
