import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Logger } from 'src/logger/logger';
import { frontChatApiToken, frontChatIdentitySecret } from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import { FrontChatContactCustomFields, FrontChatContactProfile } from './front-chat.interface';

const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
const logger = new Logger('FrontChatService');

@Injectable()
export class FrontChatService {
  computeUserHash(email: string): string {
    return createHmac('sha256', frontChatIdentitySecret).update(email).digest('hex');
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

  async createContact(profile: FrontChatContactProfile & { customFields?: FrontChatContactCustomFields }) {
    const { email, name, customFields } = profile;

    if (isCypressTestEmail(email)) {
      logger.log('Skipping Front Chat contact creation for Cypress test email');
      return null;
    }

    try {
      return await this.frontApiRequest('POST', '/contacts', {
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
        // Add new email handle when email changes
        updateBody.handles = [{ source: 'email', handle: profile.email }];
      }

      return await this.frontApiRequest('PATCH', `/contacts/${contactId}`, updateBody);
    } catch (error) {
      if (this.isContactNotFoundError(error)) {
        try {
          await this.createContact({ email, ...profile });
          return await this.frontApiRequest(
            'PATCH',
            `/contacts/${this.getContactAlias(email)}`,
            { name: profile.name },
          );
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
      return await this.frontApiRequest('PATCH', `/contacts/${contactId}`, {
        custom_fields: serialized,
      });
    } catch (error) {
      if (this.isContactNotFoundError(error)) {
        try {
          await this.createContact({ email, customFields });
          return await this.frontApiRequest(
            'PATCH',
            `/contacts/${this.getContactAlias(email)}`,
            { custom_fields: serialized },
          );
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
