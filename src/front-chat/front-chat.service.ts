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
      throw new Error(`Front API ${method} ${path} failed (${response.status}): ${errorBody}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async createContact(
    profile: FrontChatContactProfile & { customFields?: FrontChatContactCustomFields },
  ) {
    const { email, name, customFields } = profile;

    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact creation for Cypress test email');
      return null;
    }

    let contact: unknown;
    try {
      contact = await this.frontApiRequest('POST', '/contacts', {
        handles: [{ source: 'email', handle: email }],
        ...(name && { name }),
        ...(customFields && { custom_fields: this.serializeCustomFields(customFields) }),
      });
    } catch (error) {
      throw new Error(
        `Create Front Chat contact API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }

    await this.ensureContactInList(email);
    return contact;
  }

  async updateContactProfile(profile: FrontChatContactProfile, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact profile update for Cypress test email');
      return null;
    }

    try {
      const contactId = this.getContactAlias(email);
      const updateBody: Record<string, unknown> = {};

      if (profile.name) {
        updateBody.name = profile.name;
      }
      if (profile.email && profile.email !== email) {
        updateBody.handles = [{ source: 'email', handle: profile.email }];
      }

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

  private async ensureContactInList(email: string): Promise<void> {
    if (!frontContactListId || isCypressTestEmail(email)) return;

    try {
      await this.frontApiRequest('POST', `/contact_groups/${frontContactListId}/contacts`, {
        contact_ids: [this.getContactAlias(email)],
      });
    } catch (error) {
      logger.warn(`Front add-to-list failed for ${email}: ${error?.message || 'unknown error'}`);
    }
  }

  // Front's contact alias format for email handles: https://dev.frontapp.com/reference/contacts
  private getContactAlias(email: string): string {
    return `alt:email:${email}`;
  }

  private isContactNotFoundError(error: unknown): boolean {
    const message = (error as Error)?.message || '';
    return message.includes('404') || message.includes('not_found');
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
