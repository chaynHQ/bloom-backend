import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from './logger/logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const PORT = process.env.PORT || 35001;
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('Bloom backend API')
    .setDescription('Bloom backend API')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  const logger = app.get(Logger);
  app.useLogger(logger);
  await app.listen(PORT);
  console.log(`Listening on localhost:${PORT}, CTRL+C to stop`);
}
bootstrap();
