import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';
import { AuthModule } from './auth/auth.module';
import config from '../ormconfig';
import { FirebaseAuthStrategy } from './auth/firebase-auth.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(config),
    LoggerModule,
    PartnerAccessModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [FirebaseAuthStrategy],
})
export class AppModule {}
