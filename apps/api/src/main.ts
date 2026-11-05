import * as dotenv from 'dotenv';
dotenv.config();

import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpErrorFilter } from './common/filters/http-exception.filter.js';
import { FixtureModeGuard } from './common/guards/fixture.guard.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  const webOrigin = process.env.WEB_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({
    origin: webOrigin && webOrigin.length > 0 ? webOrigin : ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  app.use(cookieParser());
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalGuards(new FixtureModeGuard());

  const config = new DocumentBuilder()
    .setTitle('Nexa API')
    .setDescription('Nexa V3 Platform API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
