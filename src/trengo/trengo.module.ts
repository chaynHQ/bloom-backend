import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { TrengoController } from './trengo.controller';
import { TrengoService } from './trengo.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLogEntity, UserEntity])],
  providers: [TrengoService, EventLoggerService],
  controllers: [TrengoController],
})
export class TrengoModule {}
