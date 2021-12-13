import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/user.repository';
import { PartnerAdminController } from './partner-admin.controller';
import { PartnerAdminRepository } from './partner-admin.repository';
import { PartnerAdminService } from './partner-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerAdminRepository, UserRepository])],
  controllers: [PartnerAdminController],
  providers: [PartnerAdminService],
})
export class PartnerAdminModule {}
