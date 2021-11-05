import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { configService } from './config.service';
import { LoggerModule } from './logger/logger.module';
import { PartnerAccessModule } from './partner-access/partner-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    LoggerModule,
    PartnerAccessModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
