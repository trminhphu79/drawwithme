import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const origin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';
  app.enableCors({ origin: origin.split(','), credentials: true });

  // Accept large snapshot data URLs.
  const express = app.getHttpAdapter().getInstance();
  express.use(require('express').json({ limit: '25mb' }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`DrawWithMe API listening on http://0.0.0.0:${port}/api`);
}

void bootstrap();
