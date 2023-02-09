import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerService } from 'src/partner/partner.service';
import { ZapierWebhookClient } from '../api/zapier/zapier-webhook-client';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { SubscriptionRepository } from '../subscription/subscription.repository';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { SubscriptionUserController } from './subscription-user.controller';
import { SubscriptionUserRepository } from './subscription-user.repository';
import { SubscriptionUserService } from './subscription-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionUserRepository,
      SubscriptionRepository,
      UserRepository,
      PartnerAccessRepository,
      PartnerRepository,
      PartnerAdminRepository,
    ]),
    FirebaseModule,
  ],
  controllers: [SubscriptionUserController],
  providers: [
    SubscriptionUserService,
    SubscriptionService,
    UserService,
    PartnerAccessService,
    ZapierWebhookClient,
    PartnerService,
  ],
})
export class SubscriptionUserModule {}
