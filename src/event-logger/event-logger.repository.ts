import { Injectable } from '@nestjs/common';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EventLoggerRepository extends Repository<EventLogEntity> {}
