import { SessionEntity } from '../entities/session.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SessionEntity)
export class SessionRepository extends Repository<SessionEntity> {}
