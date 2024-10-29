import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLogEntity } from 'src/entities/event-log.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EventLoggerService } from 'src/event-logger/event-logger.service';
import { CrispController } from './crisp.controller';
import { CrispService } from './crisp.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventLogEntity, UserEntity])],
  providers: [CrispService, EventLoggerService],
  controllers: [CrispController],
})
export class CrispModule {}
