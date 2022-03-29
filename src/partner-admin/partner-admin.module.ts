import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PartnerRepository } from 'src/partner/partner.repository';
import { PartnerService } from 'src/partner/partner.service';
import { UserRepository } from '../user/user.repository';
import { PartnerAdminController } from './partner-admin.controller';
import { PartnerAdminRepository } from './partner-admin.repository';
import { PartnerAdminService } from './partner-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartnerAdminRepository, UserRepository, PartnerRepository]),
    FirebaseModule,
  ],
  controllers: [PartnerAdminController],
  providers: [PartnerAdminService, PartnerService],
})
export class PartnerAdminModule {}
