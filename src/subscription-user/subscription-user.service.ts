import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
import { UpdateSubscriptionUserDto } from './dto/update-subscription-user.dto';
import { SubscriptionUserRepository } from './subscription-user.repository';

@Injectable()
export class SubscriptionUserService {
  constructor(
    @InjectRepository(SubscriptionUserRepository)
    private subscriptionUserRepository: SubscriptionUserRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly zapierClient: ZapierWebhookClient,
  ) {}

  async createWhatsappSubscription(
    { user }: GetUserDto,
    createSubscriptionUserDto: CreateSubscriptionUserDto,
  ): Promise<SubscriptionUserEntity | undefined> {
    const whatsapp = await this.subscriptionService.getSubscription('whatsapp');
    // Note that only one active whatsapp subscription is allowed per user.
    // A user with an existing active subscription cannot subscribe for example with a different number.
    const activeWhatsappSubscription = await this.subscriptionUserRepository.find({
      where: {
        subscriptionId: whatsapp.id,
        userId: user.id,
        cancelledAt: null,
      },
    });

    if (activeWhatsappSubscription.length === 0) {
      await this.zapierClient.addContactToRespondIO({
        phonenumber: createSubscriptionUserDto.subscriptionInfo,
        name: user.name,
      });

      return await this.subscriptionUserRepository.save({
        subscriptionId: whatsapp.id,
        userId: user.id,
        subscriptionInfo: createSubscriptionUserDto.subscriptionInfo,
      });
    } else {
      throw new HttpException('Whatsapp subscription already exists for user', HttpStatus.CONFLICT);
    }
  }

  async cancelWhatsappSubscription({ id }: UpdateSubscriptionUserDto) {
    const subscription = await this.subscriptionUserRepository
      .createQueryBuilder('subscription_user')
      .where('subscription_user.subscriptionUserId = :id', { id })
      .getOne();

    if (subscription) {
      if (!subscription.cancelledAt) {
        subscription.cancelledAt = new Date();
        // TODO Remove contact from Respond.io
        return this.subscriptionUserRepository.save(subscription);
      }
      throw new HttpException('Subscription has already been cancelled', HttpStatus.CONFLICT);
    } else {
      throw new HttpException('Could not find subscription', HttpStatus.BAD_REQUEST);
    }
  }
}
