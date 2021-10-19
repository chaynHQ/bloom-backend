import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { isProduction } from './constants';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
      ignoreEnvFile: isProduction,
      cache: true,
    }),
    LoggerModule,
    TypeOrmModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
