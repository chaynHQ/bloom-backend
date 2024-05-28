import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { IsNull, Repository } from 'typeorm';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { Logger } from '../logger/logger';
import { SubscriptionService } from '../subscription/subscription.service';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { WhatsappSubscriptionStatusEnum } from '../utils/constants';
import { formatSubscriptionObject } from '../utils/serialize';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
import { UpdateSubscriptionUserDto } from './dto/update-subscription-user.dto';
import { ISubscriptionUser } from './subscription-user.interface';

@Injectable()
export class SubscriptionUserService {
  private readonly logger = new Logger('SubscriptionUserService');

  constructor(
    @InjectRepository(SubscriptionUserEntity)
    private subscriptionUserRepository: Repository<SubscriptionUserEntity>,
    private readonly subscriptionService: SubscriptionService,
    private readonly zapierClient: ZapierWebhookClient,
  ) {}

  async createWhatsappSubscription(
    { user }: GetUserDto,
    createSubscriptionUserDto: CreateSubscriptionUserDto,
  ): Promise<ISubscriptionUser | undefined> {
    const whatsapp = await this.subscriptionService.getSubscription('whatsapp');
    // Note that only one active whatsapp subscription is allowed per user.
    // A user with an existing active subscription cannot subscribe for example with a different number.
    const activeWhatsappSubscription = await this.subscriptionUserRepository.findBy({
      subscriptionId: whatsapp.id,
      userId: user.id,
      cancelledAt: IsNull(),
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

      const createdSubscription = await this.subscriptionUserRepository.save({
        subscriptionId: whatsapp.id,
        userId: user.id,
        subscriptionInfo: sanitizedPhonenumber,
      });

      return this.getFullSubscriptionInfo({ id: createdSubscription.id, userId: user.id });
    } else {
      throw new HttpException(WhatsappSubscriptionStatusEnum.ALREADY_EXISTS, HttpStatus.CONFLICT);
    }
  }

  async cancelWhatsappSubscription(
    userId: string,
    userEmail: string,
    { cancelledAt }: UpdateSubscriptionUserDto,
    id: string,
  ) {
    const subscription = await this.subscriptionUserRepository
      .createQueryBuilder('subscription_user')
      .where('subscription_user.subscriptionUserId = :id', { id })
      .andWhere('subscription_user.userId = :userId', { userId: userId })
      .getOne();

    if (subscription) {
      if (!subscription.cancelledAt) {
        this.logger.log(
          `Triggering zapier to remove contact (number: ${subscription.subscriptionInfo}) from respond.io for user ${userEmail}.`,
        );
        await this.zapierClient.deleteContactFromRespondIO({
          phonenumber: subscription.subscriptionInfo,
        });

        subscription.cancelledAt = cancelledAt;
        await this.subscriptionUserRepository.save(subscription);

        return this.getFullSubscriptionInfo({ id: subscription.id, userId });
      } else {
        throw new HttpException('Subscription has already been cancelled', HttpStatus.CONFLICT);
      }
    } else {
      throw new HttpException('Could not find subscription', HttpStatus.BAD_REQUEST);
    }
  }

  async getFullSubscriptionInfo({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<ISubscriptionUser> {
    const subscription = await this.subscriptionUserRepository
      .createQueryBuilder('subscription_user')
      .leftJoinAndSelect('subscription_user.subscription', 'subscription')
      .where('subscription_user.subscriptionUserId = :id', { id })
      .andWhere('subscription_user.userId = :userId', { userId })
      .getOne();

    return formatSubscriptionObject(subscription);
  }

  sanitizePhonenumber = (phonenumber: string) => {
    return phonenumber.replace(/\s/g, ''); // remove spaces
  };

  async softDeleteSubscriptionsForUser(userId, userEmail): Promise<SubscriptionUserEntity[]> {
    try {
      const subscriptions = await this.subscriptionUserRepository.find({
        where: { userId: userId },
      });
      const cancelledAt = new Date();

      const updatedSubscriptions: SubscriptionUserEntity[] = await Promise.all(
        subscriptions.map(async (subs): Promise<SubscriptionUserEntity> => {
          if (subs.cancelledAt !== null) {
            await this.cancelWhatsappSubscription(userId, userEmail, { cancelledAt }, subs.id);
          }
          const subscription = await this.subscriptionUserRepository.findOne({
            where: { id: subs.id },
          });
          const updatedSubscription = {
            ...subscription,
            subscriptionInfo: `Number Redacted`,
          };

          return await this.subscriptionUserRepository.save(updatedSubscription);
        }),
      );
      this.logger.log(
        `Redacted number for ${updatedSubscriptions.length} subscription(s) for user with email ${userEmail}`,
      );
      return updatedSubscriptions;
    } catch (err) {
      throw new HttpException(
        `softDeleteSubscriptionUser error - ${err}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
