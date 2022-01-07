import { SessionUserEntity } from 'src/entities/session-user.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(SessionUserEntity)
export class SessionUserRepository extends Repository<SessionUserEntity> {}
