import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { TherapySessionService } from './therapy-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([TherapySessionEntity])],
  providers: [SlackMessageClient],
  exports: [TherapySessionService],
})
export class TherapySessionModule {}
