import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { EVENT_NAME, ICreateEventLog } from './event-logger.interface';

const logger = new Logger('EventLogger');

@Injectable()
export class EventLoggerService {
  constructor(
    @InjectRepository(EventLogEntity)
    private eventLoggerRepository: Repository<EventLogEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async getEventLog(id: string): Promise<EventLogEntity> {
    return await this.eventLoggerRepository.findOneBy({ id });
  }

  async getMessageSentEventLogs(): Promise<EventLogEntity[]> {
    return await this.eventLoggerRepository.find({
      where: { event: EVENT_NAME.CHAT_MESSAGE_SENT },
      relations: { user: true },
    });
  }

  async createEventLog({ email, userId, event, date }: ICreateEventLog) {
    try {
      if (!userId && !email) {
        logger.error('createEventLog - failed to create event log - no user id or email provided');
        throw new HttpException(
          `createEventLog - failed to create event log - no user id or email provided`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!userId && email) {
        const user = await this.userRepository.findOneBy({ email });
        if (!user) {
          logger.error(
            'createEventLog - failed to create event log - no user found for email provided',
          );
          throw new HttpException(
            `createEventLog - failed to create event log - no user found for email provided`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        userId = user.id;
      }

      const eventLog = await this.eventLoggerRepository.create({
        userId,
        event,
        date,
      });
      const eventLogRecord = this.eventLoggerRepository.save(eventLog);
      return eventLogRecord;
    } catch (err) {
      throw new HttpException(
        `createEventLog - failed to create event log ${err}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
