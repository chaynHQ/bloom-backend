import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionRepository extends Repository<SubscriptionEntity> {}
