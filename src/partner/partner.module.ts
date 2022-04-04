import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAdminRepository } from '../partner-admin/partner-admin.repository';
import { UserRepository } from '../user/user.repository';
import { PartnerController } from './partner.controller';
import { PartnerRepository } from './partner.repository';
import { PartnerService } from './partner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerRepository,
      UserRepository,
      PartnerAccessRepository,
      PartnerAdminRepository,
    ]),
  ],
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
