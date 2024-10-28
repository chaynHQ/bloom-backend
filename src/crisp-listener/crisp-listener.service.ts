import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Crisp from 'crisp-api';
import { EVENT_NAME } from 'src/crisp/crisp.interface';
import { CrispService } from 'src/crisp/crisp.service';
import { CrispEventDto } from 'src/crisp/dtos/crisp.dto';
import { crispPluginId, crispPluginKey } from 'src/utils/constants';
const CrispClient = new Crisp();
const logger = new Logger('CrispLogger');

// This service is split from CrispService due to CrispService being imported/initiated multiple times
// To avoid creating duplicate listeners and events, this CrispListenerService was decoupled
@Injectable()
export class CrispListenerService implements OnModuleInit {
  constructor(private crispService: CrispService) {
    CrispClient.authenticateTier('plugin', crispPluginId, crispPluginKey);
  }

  onModuleInit() {
    logger.log(`Crisp service initiated`);

    try {
      const handleCrispEvent = async (message, eventName) =>
        await this.crispService.handleCrispEvent(message, eventName);

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
