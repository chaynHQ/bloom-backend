import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from './logger/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(Logger);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT'));
}
bootstrap();
