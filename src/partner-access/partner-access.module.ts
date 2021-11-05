import { Module } from '@nestjs/common';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessService } from './partner-access.service';

@Module({
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService]
})
export class PartnerAccessModule {}
