import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { ServiceUserProfilesService } from './service-user-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [ServiceUserProfilesService, UserService],
})
export class ServiceUserProfilesModule {}
