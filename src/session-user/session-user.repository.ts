import { SessionUserEntity } from '../entities/Session-user.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SessionUserEntity)
export class SessionUserRepository extends Repository<SessionUserEntity> {}
