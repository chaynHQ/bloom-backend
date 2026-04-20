import { Injectable } from '@nestjs/common';
import Crisp from 'crisp-api';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { Logger } from 'src/logger/logger';
import { crispPluginId, crispPluginKey, crispWebsiteId } from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import {
  CrispPeopleDataUpdateParams,
  CrispProfileBase,
  CrispProfileCustomFields,
  CrispProfileDataResponse,
  EVENT_NAME,
} from './crisp.interface';
import { CrispEventDto } from './dtos/crisp.dto';

const CrispClient = new Crisp();
const logger = new Logger('CrispService');

@Injectable()
export class CrispService {
  constructor(private eventLoggerService: EventLoggerService) {
    CrispClient.authenticateTier('plugin', crispPluginId, crispPluginKey);
  }

  // Convert CrispProfileCustomFields to the format crisp-api expects (primitive values only)
  private toCrispDataParams(peopleData: CrispProfileCustomFields): CrispPeopleDataUpdateParams {
    const data: CrispPeopleDataUpdateParams = {};
    for (const [key, value] of Object.entries(peopleData)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }
    return data;
  }

  private isProfileNotFoundError(error: unknown): boolean {
    // Based on Crisp API docs, error format is: { reason: 'error', message: 'not_found', code: 404 }
    const errorObj = error as Record<string, unknown>;

    return (
      errorObj.code === 404 ||
      errorObj.message === 'not_found' ||
      (errorObj.reason === 'error' && errorObj.message === 'not_found')
    );
  }

  async handleCrispEvent(message: CrispEventDto, eventName: EVENT_NAME) {
    try {
      if (
        eventName === EVENT_NAME.CHAT_MESSAGE_RECEIVED &&
        typeof message.content !== 'string' &&
        'namespace' in message.content
      ) {
        // When a conversation is resolved on crisp, the message:received event is fired with
        // message.content.namespace = "state:resolved"
        // Prevent our events being logged for conversation resolved events
        return;
      }
      const sessionMetaData = await CrispClient.website.getConversationMetas(
        message.website_id,
        message.session_id,
      );
      await this.eventLoggerService.createEventLog(
        {
          event: eventName,
          date: new Date(),
        },
        sessionMetaData.email,
      );
    } catch (error) {
      throw new Error(
        `Failed to handle crisp event for ${eventName}: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async createCrispProfile(newPeopleProfile: CrispProfileBase) {
    if (isCypressTestEmail(newPeopleProfile.email)) {
      logger.log('Skipping Crisp profile creation for Cypress test email');
      return null;
    }

    try {
      return await CrispClient.website.addNewPeopleProfile(crispWebsiteId, newPeopleProfile);
    } catch (error) {
      throw new Error(`Create crisp profile API call failed: ${error?.message || 'unknown error'}`, {
        cause: error,
      });
    }
  }

  async updateCrispProfileBase(
    peopleProfile: CrispProfileBase,
    email: string,
  ) {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Crisp profile base update for Cypress test email');
      return null;
    }

    try {
      return await CrispClient.website.updatePeopleProfile(crispWebsiteId, email, peopleProfile);
    } catch (error) {
      // Only handle profile not found errors (404, not_found, or profile-related errors)
      if (this.isProfileNotFoundError(error)) {
        try {
          await this.createCrispProfile({ email, ...peopleProfile });
          return await CrispClient.website.updatePeopleProfile(
            crispWebsiteId,
            email,
            peopleProfile,
          );
        } catch {
          throw new Error(
            `Update crisp profile base API call failed: ${error?.message || 'unknown error'}`,
          );
        }
      }
      // Re-throw non-profile-not-found errors (rate limits, auth, network, etc.)
      throw new Error(
        `Update crisp profile base API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  async updateCrispPeopleData(
    peopleData: CrispProfileCustomFields,
    email: string,
  ): Promise<CrispProfileDataResponse> {
    if (isCypressTestEmail(email)) {
      logger.log('Skipping Crisp people data update for Cypress test email');
      return null;
    }

    const params = this.toCrispDataParams(peopleData);
    // crisp-api's typings incorrectly expect a flat object, but the REST API and crisp-api
    // EXAMPLES.md both require the payload wrapped in { data: ... }. Cast to bypass the wrong type.
    const body = { data: params } as unknown as Record<string, string | number | boolean>;

    try {
      return await CrispClient.website.updatePeopleData(crispWebsiteId, email, body);
    } catch (error) {
      // Only handle profile not found errors (404, not_found, or profile-related errors)
      if (this.isProfileNotFoundError(error)) {
        try {
          await this.createCrispProfile({ email });
          return await CrispClient.website.updatePeopleData(crispWebsiteId, email, body);
        } catch {
          throw new Error(
            `Update crisp profile API call failed: ${error?.message || 'unknown error'}`,
          );
        }
      }
      // Re-throw non-profile-not-found errors (rate limits, auth, network, etc.)
      throw new Error(`Update crisp profile API call failed: ${error?.message || 'unknown error'}`, {
        cause: error,
      });
    }
  }

  async deleteCrispProfile(email: string) {
    try {
      await CrispClient.website.removePeopleProfile(crispWebsiteId, email);
    } catch (error) {
      throw new Error(`Delete crisp profile API call failed: ${error?.message || 'unknown error'}`, {
        cause: error,
      });
    }
  }

  async deleteCypressCrispProfiles() {
    try {
      const profiles = await CrispClient.website.listPeopleProfiles(
        crispWebsiteId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'cypresstestemail+',
      );

      logger.log(`Deleting ${profiles.length} crisp profiles`);

      profiles?.forEach(async (profile) => {
        await CrispClient.website.removePeopleProfile(crispWebsiteId, profile.email);
      });
    } catch (error) {
      throw new Error(
        `Delete cypress crisp profiles API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }

  // Supports getCrispMessageOriginAnalytics by splitting out logic to get all session IDs
  // Combining the logic into one request causes a request timeout as it takes >30 seconds
  async getAllConversationSessionIds() {
    const messageSentEvents = await this.eventLoggerService.getMessageSentEventLogs();
    const userEmails = [...new Set(messageSentEvents.flatMap((event) => event.user.email))];
    const sessionIds: string[] = [];
    for (const userEmail of userEmails) {
      try {
        const conversations = await CrispClient.website.listPeopleConversations(
          crispWebsiteId,
          userEmail,
        );
        sessionIds.push(...conversations);
      } catch (error) {
        // skip
        logger.error(`Failed to get conversations for a user: ${error?.message || 'unknown error'}`);
      }
    }
    return sessionIds;
  }

  // Returns an analytics string containing the number/percentage of crisp messages
  // sent by email vs within the chat widget
  async getCrispMessageOriginAnalytics(sessionIds) {
    let totalEmailOrigin = 0;
    let totalChatOrigin = 0;

    try {
      for (const sessionId of sessionIds) {
        const messages = await CrispClient.website.getMessagesInConversation(
          crispWebsiteId,
          sessionId,
        );

        for (const message of messages) {
          if (message.from === 'user') {
            if (message.origin === 'chat') totalChatOrigin++;
            if (message.origin === 'email') totalEmailOrigin++;
          }
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to get message origin for a session: ${error?.message || 'unknown error'}`,
      );
    }
    const totalMessages = totalEmailOrigin + totalChatOrigin;
    const chatPercentage =
      totalMessages === 0 ? 0 : Math.round((totalChatOrigin / totalMessages) * 100);
    const emailPercentage =
      totalMessages === 0 ? 0 : Math.round((totalEmailOrigin / totalMessages) * 100);

    return `Crisp message origin report: ${totalChatOrigin} (${chatPercentage}%) chat widget origin, ${totalEmailOrigin} (${emailPercentage}%) email origin`;
  }
}
