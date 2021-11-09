import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartnerAccessRepository, PartnerRepository, PartnerAdminRepository]),
  ],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService],
})
export class PartnerAccessModule {}
