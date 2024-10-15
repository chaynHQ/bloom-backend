import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Crisp from 'crisp-api';
import { sendMailchimpUserEvent } from 'src/api/mailchimp/mailchimp-api';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { crispPluginId, crispPluginKey, crispWebsiteId } from 'src/utils/constants';
import {
  CrispProfileBase,
  CrispProfileBaseResponse,
  CrispProfileCustomFields,
  CrispProfileDataResponse,
  EVENT_NAME,
  NewCrispProfileBaseResponse,
} from './crisp.interface';
import { CrispEventDto } from './dtos/crisp.dto';

const CrispClient = new Crisp();
const logger = new Logger('CrispLogger');

@Injectable()
export class CrispService implements OnModuleInit {
  constructor(private eventLoggerService: EventLoggerService) {
    CrispClient.authenticateTier('plugin', crispPluginId, crispPluginKey);
  }

  onModuleInit() {
    logger.log(`Crisp service initiated`);

    try {
      const handleCrispEvent = async (message, eventName) =>
        await this.handleCrispEvent(message, eventName);

      CrispClient.on('message:send', async function (message: CrispEventDto) {
        handleCrispEvent(message, EVENT_NAME.CHAT_MESSAGE_SENT);
      })
        .then(function () {
          logger.log('Crisp service listening to sent messages');
        })
        .catch(function (error) {
          logger.error('Crisp service failed listening to sent messages:', error);
        });

      CrispClient.on('message:received', function (message: CrispEventDto) {
        handleCrispEvent(message, EVENT_NAME.CHAT_MESSAGE_RECEIVED);
      })
        .then(function () {
          logger.log('Crisp service listening to received messages');
        })
        .catch(function (error) {
          logger.error('Crisp service failed listening to sent messages:', error);
        });
    } catch (error) {
      logger.error('Crisp service failed to initiate:', error);
    }
  }

  async handleCrispEvent(message: CrispEventDto, eventName: EVENT_NAME) {
    try {
      const sessionMetaData = await CrispClient.website.getConversationMetas(
        message.website_id,
        message.session_id,
      );
      await this.eventLoggerService.createEventLog({
        email: sessionMetaData.email,
        event: eventName,
        date: new Date(),
      });

      if (eventName === EVENT_NAME.CHAT_MESSAGE_RECEIVED) {
        sendMailchimpUserEvent(
          sessionMetaData.email,
          MAILCHIMP_CUSTOM_EVENTS.CRISP_MESSAGE_RECEIVED,
        );
      }
    } catch (error) {
      throw new Error(`Failed to handle crisp event for ${eventName}: ${error}`);
    }
  }

  async createCrispProfile(
    newPeopleProfile: CrispProfileBase,
  ): Promise<NewCrispProfileBaseResponse> {
    try {
      const crispProfile = CrispClient.website.addNewPeopleProfile(
        crispWebsiteId,
        newPeopleProfile,
      );
      return crispProfile;
    } catch (error) {
      throw new Error(`Create crisp profile API call failed: ${error}`);
    }
  }

  // Note getCrispProfile is not currently used
  async getCrispProfile(email: string): Promise<CrispProfileBaseResponse> {
    try {
      const crispProfile = CrispClient.website.getPeopleProfile(crispWebsiteId, email);
      return crispProfile;
    } catch (error) {
      throw new Error(`Get crisp profile base API call failed: ${error}`);
    }
  }

  // Note getCrispPeopleData is not currently used
  async getCrispPeopleData(email: string): Promise<CrispProfileDataResponse> {
    try {
      const crispPeopleData = CrispClient.website.getPeopleData(crispWebsiteId, email);
      return crispPeopleData;
    } catch (error) {
      throw new Error(`Get crisp profile API call failed: ${error}`);
    }
  }

  async updateCrispProfileBase(
    peopleProfile: CrispProfileBase,
    email: string,
  ): Promise<CrispProfileBaseResponse> {
    try {
      const crispProfile = CrispClient.website.updatePeopleProfile(
        crispWebsiteId,
        email,
        peopleProfile,
      );
      return crispProfile;
    } catch (error) {
      throw new Error(`Update crisp profile base API call failed: ${error}`);
    }
  }

  async updateCrispPeopleData(
    peopleData: CrispProfileCustomFields,
    email: string,
  ): Promise<CrispProfileDataResponse> {
    try {
      const crispPeopleData = CrispClient.website.updatePeopleData(
        crispWebsiteId,
        email,
        peopleData,
      );
      return crispPeopleData;
    } catch (error) {
      throw new Error(`Update crisp profile API call failed: ${error}`);
    }
  }

  async deleteCrispProfile(email: string) {
    try {
      CrispClient.website.removePeopleProfile(crispWebsiteId, email);
    } catch (error) {
      throw new Error(`Delete crisp profile API call failed: ${error}`);
    }
  }

  async deleteCypressCrispProfiles() {
    try {
      const profiles = CrispClient.website.listPeopleProfiles(
        crispWebsiteId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'cypresstestemail+',
      );

      profiles.data.data.forEach(async (profile) => {
        CrispClient.website.removePeopleProfile(crispWebsiteId, profile.email);
      });
    } catch (error) {
      throw new Error(`Delete cypress crisp profiles API call failed: ${error}`);
    }
  }
}
