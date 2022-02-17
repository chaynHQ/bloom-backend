import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { PartnerRepository } from '../partner/partner.repository';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartnerAccessRepository, UserRepository, PartnerRepository]),
    FirebaseModule,
  ],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService, AuthService, UserService],
})
export class PartnerAccessModule {}
