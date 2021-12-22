import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { UserRepository } from '../user/user.repository';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerAccessRepository, UserRepository])],
  providers: [WebhooksService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
