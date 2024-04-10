import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerFeatureEntity } from 'src/entities/partner-feature.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FeatureService } from 'src/feature/feature.service';
import { PartnerService } from 'src/partner/partner.service';
import { PartnerFeatureController } from './partner-feature.controller';
import { PartnerFeatureService } from './partner-feature.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerFeatureEntity,
      PartnerAccessEntity,
      PartnerAdminEntity,
      UserEntity,
      PartnerEntity,
      FeatureEntity,
    ]),
  ],
  controllers: [PartnerFeatureController],
  providers: [PartnerService, PartnerFeatureService, FeatureService],
})
export class PartnerFeatureModule {}
