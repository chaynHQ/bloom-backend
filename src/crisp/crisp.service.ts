import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Crisp from 'crisp-api';
import { sendMailchimpUserEvent } from 'src/api/mailchimp/mailchimp-api';
import { MAILCHIMP_CUSTOM_EVENTS } from 'src/api/mailchimp/mailchimp-api.interfaces';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { crispPluginId, crispPluginKey } from 'src/utils/constants';
import { EVENT_NAME } from './crisp.interface';
import { CrispEventDto } from './dtos/crisp.dto';

const CrispClient = new Crisp();
const logger = new Logger('CrispLogger');

@Injectable()
export class CrispService implements OnModuleInit {
  constructor(private eventLoggerService: EventLoggerService) {
    CrispClient.authenticateTier('plugin', crispPluginId, crispPluginKey);
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
}
