import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(TherapySessionEntity)
export class TherapySessionRepository extends Repository<TherapySessionEntity> {}
