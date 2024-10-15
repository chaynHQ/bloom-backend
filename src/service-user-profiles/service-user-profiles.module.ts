import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrispService } from 'src/crisp/crisp.service';
import { UserEntity } from 'src/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { ServiceUserProfilesService } from './service-user-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [ServiceUserProfilesService, UserService, CrispService],
})
export class ServiceUserProfilesModule {}
