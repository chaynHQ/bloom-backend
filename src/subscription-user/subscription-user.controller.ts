import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from 'src/entities/user.entity';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { CreateSubscriptionUserDto } from './dto/create-subscription-user.dto';
import { GetSubscriptionUserDto } from './dto/get-subscription-user.dto';
import { UpdateSubscriptionUserDto } from './dto/update-subscription-user.dto';
import { ISubscriptionUser } from './subscription-user.interface';
import { SubscriptionUserService } from './subscription-user.service';

@ApiTags('Subscription User')
@ControllerDecorator()
@Controller('/v1/subscription-user')
export class SubscriptionUserController {
  constructor(private readonly subscriptionUserService: SubscriptionUserService) {}

  @Get('/subscription_user')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Returns all the subscriptions of the authenticated user.',
  })
  @UseGuards(FirebaseAuthGuard)
  async getUserSubscriptions(@Req() req: Request): Promise<GetSubscriptionUserDto[]> {
    const user = req['userEntity'] as UserEntity;
    const userId = user.id;

    const userSubscriptions = await this.subscriptionUserService.getSubscriptions(userId);

    const subscriptionDtos = userSubscriptions.map((subscriptionUser) => {
      const dto = new GetSubscriptionUserDto();
      dto.id = subscriptionUser.id;
      dto.subscriptionId = subscriptionUser.subscription.id;
      dto.subscriptionName = subscriptionUser.subscription.name;
      dto.subscriptionInfo = subscriptionUser.subscription.info;
      dto.createdAt = subscriptionUser.createdAt;
      dto.cancelledAt = subscriptionUser.cancelledAt;
      dto.subscriptionInfo = subscriptionUser.subscriptionInfo;
      return dto;
    });

    return subscriptionDtos;
  }

  @Post('/whatsapp')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Stores relationship between a `User` and the subscription record for the whatsapp service (if an active subscription does not yet exist for that user)',
  })
  @UseGuards(FirebaseAuthGuard)
  async createWhatsappSubscription(
    @Req() req: Request,
    @Body() createSubscriptionUserDto: CreateSubscriptionUserDto,
  ): Promise<ISubscriptionUser | undefined> {
    return await this.subscriptionUserService.createWhatsappSubscription(
      req['user'],
      createSubscriptionUserDto,
    );
  }

  @Patch('/whatsapp/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Cancel an active whatsapp subscription',
  })
  @ApiParam({ name: 'id', description: 'Cancels subscribtion by id' })
  @UseGuards(FirebaseAuthGuard)
  async cancelWhatsappSubscription(
    @Req() req: Request,
    @Param() { id },
    @Body() updateSubscriptionsDto: UpdateSubscriptionUserDto,
  ): Promise<ISubscriptionUser | undefined> {
    return this.subscriptionUserService.cancelWhatsappSubscription(
      req['user'].user.id,
      req['user'].user.email,
      updateSubscriptionsDto,
      id,
    );
  }
}
