import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { Logger } from './logger/logger';
import { LoggingInterceptor } from './logger/logging.interceptor';
import { ExceptionsFilter } from './utils/exceptions.filter';

async function bootstrap() {
  const PORT = process.env.PORT || 35001;
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('Bloom backend API')
    .setDescription('Bloom backend API')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new ExceptionsFilter());
  await app.listen(PORT);
  console.log(`Listening on localhost:${PORT}, CTRL+C to stop`);
}
bootstrap();
