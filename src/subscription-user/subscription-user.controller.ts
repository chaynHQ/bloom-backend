import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { ControllerDecorator } from '../utils/controller.decorator';
import { SubscriptionUserService } from './subscription-user.service';

@ApiTags('Subscription User')
@ControllerDecorator()
@Controller('/v1/subscription-user')
export class SubscriptionUserController {
  constructor(private readonly subscriptionUserService: SubscriptionUserService) {}

  @Post('/whatsapp')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    description:
      'Stores relationship between a `User` and whatsapp subscription record, if an active subscription does not yet exist',
  })
  // TODO add body which contains phone number
  @UseGuards(FirebaseAuthGuard)
  async createWhatsappSubscription(@Req() req: Request) {
    return await this.subscriptionUserService.createWhatsappSubscription(req['user']);
  }
}
