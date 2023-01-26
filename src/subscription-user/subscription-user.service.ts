import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionUserEntity } from '../entities/subscription-user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { GetUserDto } from '../user/dtos/get-user.dto';
import { SubscriptionUserRepository } from './subscription-user.repository';

@Injectable()
export class SubscriptionUserService {
  constructor(
    @InjectRepository(SubscriptionUserRepository)
    private subscriptionUserRepository: SubscriptionUserRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // TODO add phone number
  async createWhatsappSubscription({
    user,
  }: GetUserDto): Promise<SubscriptionUserEntity | undefined> {
    console.log(user);

    const whatsapp = await this.subscriptionService.getSubscription('whatsapp');
    console.log('whatsapp object', whatsapp);

    const activeWhatsappSubscription = await this.subscriptionUserRepository.find({
      where: { subscriptionId: whatsapp.id, userId: user.id, cancelledAt: null },
    });
    console.log('existing subsc', activeWhatsappSubscription);

    if (activeWhatsappSubscription.length === 0) {
      // TODO send call to zapier
      return await this.subscriptionUserRepository.save({
        subscriptionId: whatsapp.id,
        userId: user.id,
      });
    } else {
      throw new HttpException('Whatsapp subscription already exists for user', HttpStatus.CONFLICT);
    }
  }
}
