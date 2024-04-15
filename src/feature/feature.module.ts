import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from 'src/entities/feature.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity, UserEntity])],
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class FeatureModule {}
