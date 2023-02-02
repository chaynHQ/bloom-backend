import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/user.repository';
import { FeatureController } from './feature.controller';
import { FeatureRepository } from './feature.repository';
import { FeatureService } from './feature.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureRepository, UserRepository])],
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class FeatureModule {}
