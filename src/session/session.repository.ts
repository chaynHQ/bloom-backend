import { SessionEntity } from '../entities/Session.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SessionEntity)
export class SessionRepository extends Repository<SessionEntity> {}
