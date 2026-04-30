import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { frontChannelId, frontChatApiToken, frontContactListId } from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import { FrontChatContactCustomFields, FrontChatContactProfile } from './front-chat.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontChatService');

interface ChatUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  direction: 'user' | 'agent';
  text: string;
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

interface FrontApiMessage {
  id: string;
  is_inbound?: boolean;
  created_at?: number;
  body?: string;
  text?: string;
  author?: FrontApiAuthor | null;
}

// Front groups messages sharing a thread_ref into one conversation, so a stable
// per-user value gives every user a single long-running conversation.
export const buildThreadRef = (userId: string) => `bloom-user-${userId}`;

@Injectable()
export class FrontChatService {
  async sendChannelTextMessage(user: ChatUser, text: string): Promise<void> {
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
  }

  async sendChannelAttachment(user: ChatUser, file: Express.Multer.File): Promise<void> {
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
    profile: FrontChatContactProfile & { customFields?: FrontChatContactCustomFields },
  ) {
    const { email, name, customFields } = profile;

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

  // Fetch all messages for a user by looking up their conversation directly via
  // its external_conversation_id (= thread_ref = "bloom-user-{userId}").
  // This bypasses contact-source ambiguity: Front can associate a conversation
  // with a channel-source contact rather than the email-source contact we create,
  // so querying via /contacts/{alias}/conversations would return nothing.
  async getConversationHistory(user: ChatUser): Promise<ChatHistoryMessage[]> {
    if (isCypressTestEmail(user.email)) return [];

    const conversationRef = `ext:${buildThreadRef(user.id)}`;
    const allMessages: ChatHistoryMessage[] = [];
    let nextPath: string | null = `/conversations/${conversationRef}/messages?limit=100`;

    while (nextPath) {
      let page: FrontApiPaginated<FrontApiMessage>;
      try {
        page = (await this.frontApiRequest('GET', nextPath)) as FrontApiPaginated<FrontApiMessage>;
      } catch (error) {
        if (this.isContactNotFoundError(error)) return [];
        throw new Error(
          `Fetch Front messages failed: ${(error as Error)?.message || 'unknown error'}`,
        );
      }

      for (const m of page._results ?? []) {
        const text = m.text ?? this.stripHtml(m.body ?? '');
        if (!text) continue;
        allMessages.push({
          id: m.id,
          direction: m.is_inbound ? 'user' : 'agent',
          text,
          authorName: this.formatAuthorName(m.author ?? undefined),
          createdAt: (m.created_at ?? Date.now() / 1000) * 1000,
        });
      }

      const nextUrl = page._pagination?.next;
      nextPath = nextUrl ? nextUrl.replace(FRONT_API_BASE_URL, '') : null;
    }

    logger.log(`Fetched conversation history for user ${user.id}: ${allMessages.length} messages`);
    return allMessages.sort((a, b) => a.createdAt - b.createdAt);
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

  // The contact_lists endpoint requires canonical contact IDs (crd_xxx), not aliases.
  // contactId can be passed directly from a create/patch response to skip the extra lookup.
  private async ensureContactInList(email: string, contactId?: string): Promise<void> {
    if (!frontContactListId || isCypressTestEmail(email)) return;

    try {
      const id =
        contactId ??
        ((await this.frontApiRequest('GET', `/contacts/${this.getContactAlias(email)}`)) as {
          id: string;
        }).id;
      await this.frontApiRequest('POST', `/contact_lists/${frontContactListId}/contacts`, {
        contact_ids: [id],
      });
    } catch (error) {
      logger.warn(`Front add-to-list failed for ${email}: ${error?.message || 'unknown error'}`);
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
