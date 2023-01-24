import { EntityRepository, Repository } from 'typeorm';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';

@EntityRepository(SubscriptionUserEntity)
export class SubscriptionUserRepository extends Repository<SubscriptionUserEntity> {}
