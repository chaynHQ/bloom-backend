import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { EventLoggerService } from './event-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLogEntity])],
  providers: [EventLoggerService],
})
export class SessionModule {}
