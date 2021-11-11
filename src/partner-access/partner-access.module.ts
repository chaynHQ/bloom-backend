import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerAccessRepository])],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService],
})
export class PartnerAccessModule {}
