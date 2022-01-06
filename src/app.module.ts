import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';
import { AuthModule } from './auth/auth.module';
import config from '../ormconfig';
import { UserModule } from './user/user.module';
import { PartnerAdminModule } from './partner-admin/partner-admin.module';
import { PartnerModule } from './partner/partner.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(config),
    LoggerModule,
    PartnerAccessModule,
    AuthModule,
    UserModule,
    PartnerAdminModule,
    PartnerModule,
    WebhooksModule,
    SessionModule,
  ],
})
export class AppModule {}
