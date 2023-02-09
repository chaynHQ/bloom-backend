import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureRepository } from 'src/feature/feature.repository';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAdminRepository } from 'src/partner-admin/partner-admin.repository';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from 'src/user/user.repository';
import { PartnerFeatureController } from './partner-feature.controller';
import { PartnerFeatureRepository } from './partner-feature.repository';
import { PartnerFeatureService } from './partner-feature.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerFeatureRepository,
      PartnerAccessRepository,
      PartnerAdminRepository,
      UserRepository,
      PartnerRepository,
      FeatureRepository,
    ]),
  ],
  controllers: [PartnerFeatureController],
  providers: [PartnerService, PartnerFeatureService, FeatureService],
})
export class PartnerFeatureModule {}
