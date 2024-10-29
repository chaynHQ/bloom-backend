import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { CrispService } from './crisp.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLogEntity, UserEntity])],
  providers: [CrispService, EventLoggerService],
})
export class CrispModule {}
