import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Crisp from 'crisp-api';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { crispPluginId, crispPluginKey } from 'src/utils/constants';
import { Repository } from 'typeorm';
import { EVENT_NAME } from './crisp.interface';
import { CrispEventDto } from './dtos/crisp.dto';

const CrispClient = new Crisp();

@Injectable()
export class CrispService implements OnModuleInit {
  constructor(
    private eventLoggerService: EventLoggerService,

    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  onModuleInit() {
    console.log(`Crisp service initialised`);

    CrispClient.authenticateTier('plugin', crispPluginId, crispPluginKey);

    CrispClient.on('message:send', function (message: CrispEventDto) {
      console.log('message sent data:', message);
      this.eventLoggerService.createEventLog({
        email: message.user.email,
        event: EVENT_NAME.CHAT_MESSAGE_SENT,
        date: Date.now(),
      });
    })
      .then(function () {
        console.error('Crisp service listening to sent messages');
      })
      .catch(function (error) {
        console.error('Crisp service failed listening to sent messages:', error);
      });

    CrispClient.on('message:receive', function (message: CrispEventDto) {
      console.log('message received data:', message);

      this.eventLoggerService.createEventLog({
        email: message.user.email,
        event: EVENT_NAME.CHAT_MESSAGE_RECEIVED,
        date: Date.now(),
      });
    })
      .then(function () {
        console.error('Crisp service listening to received messages');
      })
      .catch(function (error) {
        console.error('Crisp service failed listening to sent messages:', error);
      });
  }
}
