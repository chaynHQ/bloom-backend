import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PartnerService } from 'src/partner/partner.service';
import { PartnerAdminController } from './partner-admin.controller';
import { PartnerAdminService } from './partner-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartnerAdminEntity, UserEntity, PartnerAccessEntity, PartnerEntity]),
    FirebaseModule,
  ],
  controllers: [PartnerAdminController],
  providers: [PartnerAdminService, PartnerService],
})
export class PartnerAdminModule {}
