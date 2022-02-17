import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { PartnerRepository } from 'src/partner/partner.repository';
import { UserRepository } from 'src/user/user.repository';
import { UserService } from 'src/user/user.service';
import { FIREBASE, firebaseFactory } from './firebase-factory';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository, PartnerRepository, PartnerAccessRepository])],
  providers: [firebaseFactory, UserService, PartnerAccessService],
  exports: [FIREBASE],
})
export class FirebaseModule {}
