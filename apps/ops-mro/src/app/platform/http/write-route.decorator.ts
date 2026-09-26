import { applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';
import { ContextGuard } from './context.guard';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/**
 * Marca uma rota de escrita: exige contexto (RLS) e `Idempotency-Key`.
 * Centraliza a regra 6 para que nenhuma rota de mutacao a esqueca.
 */
export const WriteRoute = (): MethodDecorator =>
  applyDecorators(UseGuards(ContextGuard), UseInterceptors(IdempotencyInterceptor));

/**
 * Rota de escrita SEM contexto (ex.: `POST /api/auth/login`, que acontece antes
 * de existir token). Mantem a idempotencia da regra 6, mas nao exige o
 * `ContextGuard` — que negaria a propria autenticacao.
 */
export const IdempotentRoute = (): MethodDecorator =>
  applyDecorators(UseInterceptors(IdempotencyInterceptor));
