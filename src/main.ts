import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from './logger/logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './core/http-exception.filter';

async function bootstrap() {
  const PORT = process.env.PORT || 35001;
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('Bloom backend API')
    .setDescription('Bloom backend API')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(PORT);
  console.log(`Listening on localhost:${PORT}, CTRL+C to stop`);
}
bootstrap();
