import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(SubscriptionRepository)
    private subscriptionRepository: SubscriptionRepository,
  ) {}

  async getSubscription(id: string): Promise<SubscriptionEntity> {
    return await this.subscriptionRepository.findOne({ id });
  }
}
