import { Injectable, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { EVENT_NAME } from 'src/event-logger/event-logger.interface';
import { Logger } from 'src/logger/logger';
import {
  trengoApiKey,
  trengoChannelId,
  trengoInboundWebhookSigningSecret,
  trengoOutboundWebhookSigningSecret,
} from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import {
  TrengoContactBase,
  TrengoContactCustomFields,
  TrengoContactResponse,
  TrengoCustomFieldDefinition,
  TrengoMessageResponse,
  TrengoPaginatedResponse,
  TrengoTicketResponse,
} from './trengo.interface';
import { TrengoWebhookDto } from './dtos/trengo-webhook.dto';
import * as crypto from 'crypto';

const logger = new Logger('TrengoService');

// Module-level cache for Trengo custom field IDs, shared across all TrengoService instances.
// This avoids redundant API calls when TrengoService is instantiated in multiple modules.
const customFieldCache = new Map<string, number>();
let cacheInitialized = false;

const TRENGO_API_BASE = 'https://app.trengo.com/api/v2';

// Surface Trengo's response body (status + data) so 4xx validation errors are debuggable.
function formatTrengoError(error: unknown): string {
  const err = error as { message?: string; response?: { status?: number; data?: unknown } };
  if (err?.response) {
    const { status, data } = err.response;
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    return `${status} ${err.message} — ${body}`;
  }
  return err?.message || 'unknown error';
}

@Injectable()
export class TrengoService implements OnModuleInit {
  private httpClient: AxiosInstance;

  constructor(private eventLoggerService: EventLoggerService) {
    this.httpClient = axios.create({
      baseURL: TRENGO_API_BASE,
      headers: {
        Authorization: `Bearer ${trengoApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async onModuleInit() {
    if (!cacheInitialized) {
      try {
        await this.initializeCustomFieldCache();
        cacheInitialized = true;
        logger.log(`Trengo custom field cache initialized with ${customFieldCache.size} fields`);
      } catch (error) {
        logger.error(
          `Failed to initialize Trengo custom field cache: ${error?.message || 'unknown error'}`,
        );
      }
    }
  }

  // --- Webhook signature verification ---

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    if (!signatureHeader) {
      return false;
    }

    const [timestamp, hash] = signatureHeader.split(';');
    if (!timestamp || !hash) {
      return false;
    }

    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    const providedHash = Buffer.from(hash, 'hex');

    // Trengo only allows one event per webhook, so we register separate inbound and outbound
    // webhooks, each with its own signing secret. Verify against both.
    for (const secret of [trengoInboundWebhookSigningSecret, trengoOutboundWebhookSigningSecret]) {
      if (!secret) continue;
      const expectedHash = Buffer.from(
        crypto.createHmac('sha256', secret).update(payload).digest('hex'),
        'hex',
      );
      if (
        expectedHash.length === providedHash.length &&
        crypto.timingSafeEqual(expectedHash, providedHash)
      ) {
        return true;
      }
    }

    return false;
  }

  // --- Event handling (webhook) ---

  async handleTrengoWebhookEvent(payload: TrengoWebhookDto, eventName: EVENT_NAME) {
    try {
      // Resolve the contact email from the webhook payload
      let email: string | undefined = payload.contact?.identifier || payload.contact?.email;

      if (!email && payload.contact_id) {
        // Fallback: look up the contact via API to find their email
        const contact = await this.findContactById(payload.contact_id);
        email = contact?.identifier || contact?.email;
      }

      if (!email) {
        logger.warn(
          `Unable to resolve contact email for Trengo webhook event ${eventName}, ticket_id=${payload.ticket_id}`,
        );
        return;
      }

      await this.eventLoggerService.createEventLog(
        {
          event: eventName,
          date: new Date(),
        },
        email,
      );
    } catch (error) {
      throw new Error(
        `Failed to handle Trengo webhook event for ${eventName}: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  // --- Contact CRUD ---

  async createTrengoContact(profile: TrengoContactBase): Promise<TrengoContactResponse | null> {
    if (isCypressTestEmail(profile.email)) {
      logger.log('Skipping Trengo contact creation for Cypress test email');
      return null;
    }

    try {
      // Trengo requires a non-empty name; fall back to the email local-part if missing.
      const name = profile.name?.trim() || profile.email.split('@')[0];
      const response = await this.httpClient.post(`/channels/${trengoChannelId}/contacts`, {
        identifier: profile.email,
        name,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Create Trengo contact API call failed: ${formatTrengoError(error)}`,
        { cause: error },
      );
    }
  }

  async updateTrengoContactBase(profile: Partial<TrengoContactBase>, email: string) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Trengo contact base update for Cypress test email');
      return null;
    }

    try {
      const contact = await this.findContactByEmail(email);

      if (!contact) {
        // Contact not found: create it first, then update
        await this.createTrengoContact({ email, name: profile.name });
        const newContact = await this.findContactByEmail(profile.email || email);
        if (!newContact) {
          throw new Error('Contact not found after creation');
        }
        return await this.updateContactById(newContact.id, profile);
      }

      return await this.updateContactById(contact.id, profile);
    } catch (error) {
      throw new Error(
        `Update Trengo contact base API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async updateTrengoContactCustomFields(
    fields: TrengoContactCustomFields,
    email: string,
  ): Promise<void> {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Trengo contact custom fields update for Cypress test email');
      return null;
    }

    try {
      let contact = await this.findContactByEmail(email);

      if (!contact) {
        // Contact not found: create it first
        await this.createTrengoContact({ email });
        contact = await this.findContactByEmail(email);
        if (!contact) {
          throw new Error('Contact not found after creation');
        }
      }

      // Set each custom field individually (Trengo API requires one call per field)
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;

        const fieldId = await this.getOrCreateCustomFieldId(key);
        await this.httpClient.post(`/contacts/${contact.id}/custom_fields`, {
          custom_field_id: fieldId,
          value: String(value),
        });
      }
    } catch (error) {
      throw new Error(
        `Update Trengo contact custom fields API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async deleteTrengoContact(email: string) {
    try {
      const contact = await this.findContactByEmail(email);
      if (contact) {
        await this.httpClient.delete(`/contacts/${contact.id}`);
      }
    } catch (error) {
      throw new Error(
        `Delete Trengo contact API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async deleteCypressTrengoContacts() {
    try {
      const contacts = await this.searchContacts('cypresstestemail+');

      logger.log(`Deleting ${contacts.length} Trengo contacts`);

      for (const contact of contacts) {
        await this.httpClient.delete(`/contacts/${contact.id}`);
      }
    } catch (error) {
      throw new Error(
        `Delete cypress Trengo contacts API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  // --- Analytics ---

  // Returns all ticket IDs for users who have sent chat messages (for analytics)
  async getAllTicketIds(): Promise<number[]> {
    const messageSentEvents = await this.eventLoggerService.getMessageSentEventLogs();
    const userEmails = [...new Set(messageSentEvents.flatMap((event) => event.user.email))];
    const ticketIds: number[] = [];

    for (const userEmail of userEmails) {
      try {
        const contact = await this.findContactByEmail(userEmail);
        if (!contact) continue;

        const response = await this.httpClient.get<TrengoPaginatedResponse<TrengoTicketResponse>>(
          '/tickets',
          { params: { contact_id: contact.id } },
        );
        ticketIds.push(...response.data.data.map((ticket) => ticket.id));
      } catch (error) {
        logger.error(
          `Failed to get tickets for a user: ${error?.message || 'unknown error'}`,
        );
      }
    }

    return ticketIds;
  }

  // Returns an analytics string containing the number/percentage of messages
  // sent via different channel types (chat widget vs email)
  async getMessageChannelAnalytics(ticketIds: number[]) {
    let totalEmailOrigin = 0;
    let totalChatOrigin = 0;

    try {
      for (const ticketId of ticketIds) {
        const response = await this.httpClient.get<TrengoPaginatedResponse<TrengoMessageResponse>>(
          `/tickets/${ticketId}/messages`,
        );

        for (const message of response.data.data) {
          // Only count messages from the customer (contact), not from agents
          if (message.contact_id && !message.user_id) {
            if (message.channel_type === 'email' || message.channel_type === 'EMAIL') {
              totalEmailOrigin++;
            } else {
              totalChatOrigin++;
            }
          }
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to get message analytics for a ticket: ${error?.message || 'unknown error'}`,
      );
    }

    const totalMessages = totalEmailOrigin + totalChatOrigin;
    const chatPercentage =
      totalMessages === 0 ? 0 : Math.round((totalChatOrigin / totalMessages) * 100);
    const emailPercentage =
      totalMessages === 0 ? 0 : Math.round((totalEmailOrigin / totalMessages) * 100);

    return `Trengo message origin report: ${totalChatOrigin} (${chatPercentage}%) chat widget origin, ${totalEmailOrigin} (${emailPercentage}%) email origin`;
  }

  // --- Custom field ID mapping (for frontend widget integration) ---

  // Returns the cached mapping of custom field titles to Trengo numeric IDs.
  // The frontend needs these IDs to pass contact_data.custom_fields to the Trengo widget.
  getCustomFieldIds(): Record<string, number> {
    return Object.fromEntries(customFieldCache);
  }

  // --- Internal helpers ---

  async findContactByEmail(email: string): Promise<TrengoContactResponse | null> {
    try {
      const response = await this.httpClient.get<TrengoPaginatedResponse<TrengoContactResponse>>(
        '/contacts',
        { params: { term: email } },
      );
      const contacts = response.data.data;
      // Find exact match since search is fuzzy
      return contacts.find((c) => c.identifier === email || c.email === email) || null;
    } catch (error) {
      logger.warn(
        `Failed to find Trengo contact by email: ${error?.message || 'unknown error'}`,
      );
      return null;
    }
  }

  private async findContactById(contactId: number): Promise<TrengoContactResponse | null> {
    try {
      const response = await this.httpClient.get<TrengoContactResponse>(
        `/contacts/${contactId}`,
      );
      return response.data;
    } catch (error) {
      logger.warn(
        `Failed to find Trengo contact by id: ${error?.message || 'unknown error'}`,
      );
      return null;
    }
  }

  private async updateContactById(
    contactId: number,
    profile: Partial<TrengoContactBase>,
  ) {
    const updateData: Record<string, string> = {};
    if (profile.name) updateData.name = profile.name;
    if (profile.email) updateData.identifier = profile.email;

    return await this.httpClient.put(`/contacts/${contactId}`, updateData);
  }

  private async searchContacts(term: string): Promise<TrengoContactResponse[]> {
    const allContacts: TrengoContactResponse[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.httpClient.get<TrengoPaginatedResponse<TrengoContactResponse>>(
        '/contacts',
        { params: { term, page } },
      );
      allContacts.push(...response.data.data);
      hasMore = response.data.meta?.current_page < response.data.meta?.last_page;
      page++;
    }

    return allContacts;
  }

  // --- Custom field management ---

  private async initializeCustomFieldCache() {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.httpClient.get<
        TrengoPaginatedResponse<TrengoCustomFieldDefinition>
      >('/custom_fields', { params: { page } });

      for (const field of response.data.data) {
        if (field.type === 'CONTACT') {
          customFieldCache.set(field.title, field.id);
        }
      }

      hasMore = response.data.meta?.current_page < response.data.meta?.last_page;
      page++;
    }
  }

  private async getOrCreateCustomFieldId(fieldTitle: string): Promise<number> {
    const cachedId = customFieldCache.get(fieldTitle);
    if (cachedId) return cachedId;

    // Field not in cache - create it in Trengo
    try {
      const response = await this.httpClient.post<TrengoCustomFieldDefinition>('/custom_fields', {
        title: fieldTitle,
        type: 'CONTACT',
      });
      const newId = response.data.id;
      customFieldCache.set(fieldTitle, newId);
      return newId;
    } catch (error) {
      throw new Error(
        `Failed to create Trengo custom field "${fieldTitle}": ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }
}
