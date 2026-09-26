import './telemetry';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: [/^https?:\/\/([a-z0-9-]+\.)?vortex\.localhost(?::\d+)?$/], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const swagger = new DocumentBuilder().setTitle('VORTEX API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('/docs/api', app, SwaggerModule.createDocument(app, swagger));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap();
