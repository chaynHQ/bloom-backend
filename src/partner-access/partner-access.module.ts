import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserRepository } from 'src/user/user.repository';
import { PartnerAccessController } from './partner-access.controller';
import { PartnerAccessRepository } from './partner-access.repository';
import { PartnerAccessService } from './partner-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerAccessRepository, UserRepository]), FirebaseModule],
  controllers: [PartnerAccessController],
  providers: [PartnerAccessService, AuthService],
})
export class PartnerAccessModule {}
