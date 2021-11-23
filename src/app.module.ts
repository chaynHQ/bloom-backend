import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';
import { AuthModule } from './auth/auth.module';
import config from '../ormconfig';
import { UserModule } from './user/user.module';
import { PartnerAdminModule } from './partner-admin/partner-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(config),
    LoggerModule,
    PartnerAccessModule,
    AuthModule,
    UserModule,
    PartnerAdminModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
