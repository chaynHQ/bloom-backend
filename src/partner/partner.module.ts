import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartnerEntity, UserEntity, PartnerAccessEntity, PartnerAdminEntity]),
  ],
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
