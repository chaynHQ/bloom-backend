import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { dataSourceOptions } from 'src/typeorm.config';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from './auth/auth.module';
import { CoursePartnerModule } from './course-partner/course-partner.module';
import { CourseUserModule } from './course-user/course-user.module';
import { CourseModule } from './course/course.module';
import { CrispListenerModule } from './crisp-listener/crisp-listener.module';
import { CrispModule } from './crisp/crisp.module';
import { EventLoggerModule } from './event-logger/event-logger.module';
import { FeatureModule } from './feature/feature.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';
import { PartnerAdminModule } from './partner-admin/partner-admin.module';
import { PartnerFeatureModule } from './partner-feature/partner-feature.module';
import { PartnerModule } from './partner/partner.module';
import { ResourceFeedbackModule } from './resource-feedback/resource-feedback.module';
import { ResourceUserModule } from './resource-user/resource-user.module';
import { ResourceModule } from './resource/resource.module';
import { SessionFeedbackModule } from './session-feedback/session-feedback.module';
import { SessionUserModule } from './session-user/session-user.module';
import { SessionModule } from './session/session.module';
import { SubscriptionUserModule } from './subscription-user/subscription-user.module';
import { TherapySessionModule } from './therapy-session/therapy-session.module';
import { UserModule } from './user/user.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions as TypeOrmModuleOptions),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => req.headers['X-Request-Id'] ?? uuidv4(),
      },
    }),
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
    CrispModule,
    CrispListenerModule,
    ResourceModule,
    ResourceUserModule,
    ResourceFeedbackModule,
    TherapySessionModule,
  ],
})
export class AppModule {}
