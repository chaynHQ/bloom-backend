import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessRepository } from '../partner-access/partner-access.repository';
import { PartnerAccessService } from '../partner-access/partner-access.service';
import { PartnerRepository } from '../partner/partner.repository';
import { UserRepository } from '../user/user.repository';
import { UserService } from '../user/user.service';
import { FIREBASE, firebaseFactory } from './firebase-factory';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository, PartnerRepository, PartnerAccessRepository])],
  providers: [firebaseFactory, UserService, PartnerAccessService],
  exports: [FIREBASE],
})
export class FirebaseModule {}
