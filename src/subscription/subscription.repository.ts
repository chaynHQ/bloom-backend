import { EntityRepository, Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';

@EntityRepository(SubscriptionEntity)
export class SubscriptionRepository extends Repository<SubscriptionEntity> {}
