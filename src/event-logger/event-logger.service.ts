import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { Repository } from 'typeorm';
import { ICreateEventLog } from './event-logger.interface';

@Injectable()
export class EventLoggerService {
  constructor(
    @InjectRepository(EventLogEntity)
    private eventLoggerRepository: Repository<EventLogEntity>,
  ) {}

  async getEventLog(id: string): Promise<EventLogEntity> {
    return await this.eventLoggerRepository.findOneBy({ id });
  }

  async createEventLog({ userId, event, date }: ICreateEventLog) {
    try {
      const eventLog = await this.eventLoggerRepository.create({
        userId,
        event,
        date,
      });
      const savedEventLog = this.eventLoggerRepository.save(eventLog);
      return savedEventLog;
    } catch (err) {
      throw new HttpException(
        `createEventLog - failed to create event log ${err}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
