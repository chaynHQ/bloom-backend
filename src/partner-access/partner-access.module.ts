import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerRepository } from 'src/partner/partner.repository';
import { UserService } from 'src/user/user.service';
import { AuthService } from '../auth/auth.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserRepository } from '../user/user.repository';
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
