import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PartnerAccessRepository } from 'src/partner-access/partner-access.repository';
import { PartnerAccessService } from 'src/partner-access/partner-access.service';
import { PartnerRepository } from 'src/partner/partner.repository';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository, PartnerAccessRepository, PartnerRepository]),
    FirebaseModule,
  ],
  controllers: [UserController],
  providers: [UserService, AuthService, PartnerAccessService],
})
export class UserModule {}
