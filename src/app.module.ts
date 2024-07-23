import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from 'src/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { CoursePartnerModule } from './course-partner/course-partner.module';
import { CourseUserModule } from './course-user/course-user.module';
import { CourseModule } from './course/course.module';
import { EventLoggerModule } from './event-logger/event-logger.module';
import { FeatureModule } from './feature/feature.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';
import { PartnerAdminModule } from './partner-admin/partner-admin.module';
import { PartnerFeatureModule } from './partner-feature/partner-feature.module';
import { PartnerModule } from './partner/partner.module';
import { SessionFeedbackModule } from './session-feedback/session-feedback.module';
import { SessionUserModule } from './session-user/session-user.module';
import { SessionModule } from './session/session.module';
import { SubscriptionUserModule } from './subscription-user/subscription-user.module';
import { UserModule } from './user/user.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions as TypeOrmModuleOptions),
    LoggerModule,
    PartnerAccessModule,
    AuthModule,
    UserModule,
    PartnerAdminModule,
    PartnerModule,
    WebhooksModule,
    SessionModule,
    CourseModule,
    CourseUserModule,
    SessionUserModule,
    SessionFeedbackModule,
    CoursePartnerModule,
    SubscriptionUserModule,
    FeatureModule,
    PartnerFeatureModule,
    EventLoggerModule,
    HealthModule,
  ],
})
export class AppModule {}
