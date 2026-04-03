import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { EVENT_NAME } from './event-logger.interface';

const logger = new Logger('EventLogger');

@Injectable()
export class EventLoggerService {
  constructor(
    @InjectRepository(EventLogEntity)
    private eventLoggerRepository: Repository<EventLogEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async getMessageSentEventLogs(): Promise<EventLogEntity[]> {
    return await this.eventLoggerRepository.find({
      where: { event: EVENT_NAME.CHAT_MESSAGE_SENT },
      relations: { user: true },
    });
  }

  async createEventLog(
    { userId, event, date, metadata }: Partial<EventLogEntity>,
    email?: string | undefined,
  ) {
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

      return await this.eventLoggerRepository.save({ userId, event, date, metadata });
    } catch (err) {
      throw new HttpException(
        `createEventLog - failed to create event log: ${err?.message || 'unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
