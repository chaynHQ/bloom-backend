import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
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
}
