import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLoggerRepository } from './event-logger.repository';
import { EventLoggerService } from './event-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLoggerRepository])],
  providers: [EventLoggerService],
})
export class SessionModule {}
