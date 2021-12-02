import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAdminController } from './partner-admin.controller';
import { PartnerAdminRepository } from './partner-admin.repository';
import { PartnerAdminService } from './partner-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerAdminRepository])],
  controllers: [PartnerAdminController],
  providers: [PartnerAdminService],
})
export class PartnerAdminModule {}
