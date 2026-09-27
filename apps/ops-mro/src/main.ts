import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { ApiExceptionFilter } from './app/platform/http/api-exception.filter';
import { ApiResponseInterceptor } from './app/platform/http/api-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // Atras do nginx (producao) o IP real chega em X-Forwarded-For. Sem confiar no
  // proxy, todo o rate limit contaria o IP do nginx como um unico cliente.
  // O Express so aceita numero de saltos, booleano, IP/CIDR ou faixa nomeada:
  // a string "1" (como vem do `.env`) seria rejeitada como IP invalido.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy !== undefined && trustProxy !== '') {
    const hops = Number(trustProxy);
    if (Number.isFinite(hops)) {
      app.set('trust proxy', hops);
    } else if (trustProxy === 'true' || trustProxy === 'false') {
      app.set('trust proxy', trustProxy === 'true');
    } else {
      app.set('trust proxy', trustProxy);
    }
  }

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
