import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { isProduction } from './constants';
import { LoggerModule } from './logger/logger.module';
import { PartnerAdminEntity } from './partner-admin/partner-admin.entity';
import { PartnerAccessEntity } from './partners-access/partner-access.entity';
import { PartnerEntity } from './partners/partner.entity';
import { UserEntity } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        synchronize: !isProduction,
        migrationsRun: isProduction,
        entities: [UserEntity, PartnerEntity, PartnerAdminEntity, PartnerAccessEntity],
      }),
    }),
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
