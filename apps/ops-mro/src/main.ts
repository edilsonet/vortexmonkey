import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ApiExceptionFilter } from './app/platform/http/api-exception.filter';
import { ApiResponseInterceptor } from './app/platform/http/api-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Validacao de borda: corpo malformado vira VALIDATION_ERROR (422), nunca 500.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Envelope global { success, data, error }: sucesso no interceptor, falha no filtro.
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = process.env.PORT || 3400;
  await app.listen(port);
  Logger.log(`ops-mro em execucao: http://localhost:${port}/api`);
}

bootstrap();
