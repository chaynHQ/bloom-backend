import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';

@Injectable()
export class SubscriptionUserRepository extends Repository<SubscriptionUserEntity> {}
