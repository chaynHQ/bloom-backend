import { EventLogEntity } from 'src/entities/event-log.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(EventLogEntity)
export class EventLoggerRepository extends Repository<EventLogEntity> {}
