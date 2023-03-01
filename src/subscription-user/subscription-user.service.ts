import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { Logger } from '../logger/logger';
import { SubscriptionService } from '../subscription/subscription.service';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { WhatsappSubscriptionStatusEnum } from '../utils/constants';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
import { UpdateSubscriptionUserDto } from './dto/update-subscription-user.dto';
import { SubscriptionUserRepository } from './subscription-user.repository';

@Injectable()
export class SubscriptionUserService {
  private readonly logger = new Logger('SubscriptionUserService');

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

    this.logger.log(
      `Existing active whatsapp subscription for user ${user.id}: [${activeWhatsappSubscription}]`,
    );

    if (activeWhatsappSubscription.length === 0) {
      const sanitizedPhonenumber = this.sanitizePhonenumber(
        createSubscriptionUserDto.subscriptionInfo,
      );

      this.logger.log(
        `Triggering zapier to add contact (number: ${sanitizedPhonenumber}) to respond.io for user ${user.email}.`,
      );
      await this.zapierClient.addContactToRespondIO({
        phonenumber: sanitizedPhonenumber,
        name: user.name,
      });

      return await this.subscriptionUserRepository.save({
        subscriptionId: whatsapp.id,
        userId: user.id,
        subscriptionInfo: sanitizedPhonenumber,
      });
    } else {
      throw new HttpException(WhatsappSubscriptionStatusEnum.ALREADY_EXISTS, HttpStatus.CONFLICT);
    }
  }

  async cancelWhatsappSubscription(
    { user }: GetUserDto,
    { cancelledAt }: UpdateSubscriptionUserDto,
    id: string,
  ) {
    const subscription = await this.subscriptionUserRepository
      .createQueryBuilder('subscription_user')
      .where('subscription_user.subscriptionUserId = :id', { id })
      .andWhere('subscription_user.userId = :userId', { userId: user.id })
      .getOne();

    if (subscription) {
      if (!subscription.cancelledAt) {
        this.logger.log(
          `Triggering zapier to remove contact (number: ${subscription.subscriptionInfo}) from respond.io for user ${user.email}.`,
        );
        await this.zapierClient.deleteContactFromRespondIO({
          phonenumber: subscription.subscriptionInfo,
        });

        subscription.cancelledAt = cancelledAt;
        return this.subscriptionUserRepository.save(subscription);
      } else {
        throw new HttpException('Subscription has already been cancelled', HttpStatus.CONFLICT);
      }
    } else {
      throw new HttpException('Could not find subscription', HttpStatus.BAD_REQUEST);
    }
  }

  sanitizePhonenumber = (phonenumber: string) => {
    return phonenumber.replace(/\s/g, ''); // remove spaces
  };
}
