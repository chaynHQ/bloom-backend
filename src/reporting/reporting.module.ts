import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ga4AuthService } from 'src/api/ga4/ga4-auth';
import { Ga4DataClient } from 'src/api/ga4/ga4-data.client';
import { SlackMessageClient } from 'src/api/slack/slack-api';
import { AuthModule } from 'src/auth/auth.module';
import { CourseUserEntity } from 'src/entities/course-user.entity';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { ReportingRunEntity } from 'src/entities/reporting-run.entity';
import { ResourceFeedbackEntity } from 'src/entities/resource-feedback.entity';
import { ResourceUserEntity } from 'src/entities/resource-user.entity';
import { SessionFeedbackEntity } from 'src/entities/session-feedback.entity';
import { SessionUserEntity } from 'src/entities/session-user.entity';
import { SubscriptionUserEntity } from 'src/entities/subscription-user.entity';
import { TherapySessionEntity } from 'src/entities/therapy-session.entity';
import { UserEntity } from 'src/entities/user.entity';
import { DbMetricsService } from './db-metrics.service';
import { Ga4MetricsService } from './ga4-metrics.service';
import { ReportingController } from './reporting.controller';
import { ReportingScheduler } from './reporting.scheduler';
import { ReportingService } from './reporting.service';

@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      UserEntity,
      CourseUserEntity,
      SessionUserEntity,
      ResourceUserEntity,
      TherapySessionEntity,
      PartnerAccessEntity,
      SubscriptionUserEntity,
      SessionFeedbackEntity,
      ResourceFeedbackEntity,
      ReportingRunEntity,
    ]),
  ],
  controllers: [ReportingController],
  providers: [
    ReportingService,
    ReportingScheduler,
    DbMetricsService,
    Ga4MetricsService,
    Ga4AuthService,
    Ga4DataClient,
    SlackMessageClient,
  ],
})
export class ReportingModule {}
