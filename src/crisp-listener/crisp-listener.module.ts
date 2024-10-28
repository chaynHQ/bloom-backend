import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrispService } from 'src/crisp/crisp.service';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { CrispListenerService } from './crisp-listener.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLogEntity, UserEntity])],
  providers: [CrispService, CrispListenerService, EventLoggerService],
})
export class CrispListenerModule {}
