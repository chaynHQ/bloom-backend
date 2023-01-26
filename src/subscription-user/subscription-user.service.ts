import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
import { SubscriptionUserRepository } from './subscription-user.repository';

@Injectable()
export class SubscriptionUserService {
  constructor(
    @InjectRepository(SubscriptionUserRepository)
    private subscriptionUserRepository: SubscriptionUserRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createWhatsappSubscription(
    userId: string,
    createSubscriptionUserDto: CreateSubscriptionUserDto,
  ): Promise<SubscriptionUserEntity | undefined> {
    console.log(userId);

    const whatsapp = await this.subscriptionService.getSubscription('whatsapp');
    console.log('whatsapp object', whatsapp);

    // Note that only one active whatsapp subscription is allowed per user.
    // A user with an existing active subscription cannot subscribe for example with a different number.
    const activeWhatsappSubscription = await this.subscriptionUserRepository.find({
      where: {
        subscriptionId: whatsapp.id,
        userId,
        cancelledAt: null,
      },
    });
    console.log('existing subsc', activeWhatsappSubscription);

    if (activeWhatsappSubscription.length === 0) {
      // TODO send call to zapier
      return await this.subscriptionUserRepository.save({
        subscriptionId: whatsapp.id,
        userId,
        subscriptionInfo: createSubscriptionUserDto.subscriptionInfo,
      });
    } else {
      throw new HttpException('Whatsapp subscription already exists for user', HttpStatus.CONFLICT);
    }
  }
}
