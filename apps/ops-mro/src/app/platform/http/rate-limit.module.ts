import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerModule, RedisThrottlerStorage } from './redis-throttler.storage';

/** Teto global por IP (janela de 1 minuto). */
const configuredLimit = Number(process.env.RATE_LIMIT_PER_MINUTE);
const DEFAULT_LIMIT = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 300;

/**
 * Rate limit global por IP, com contador em Redis.
 *
 * Protege contra forca bruta e abuso de qualquer rota; rotas sensiveis (login,
 * refresh, logout) apertam o limite com `@Throttle`. A resposta estourada vira
 * `RATE_LIMITED` (429) pelo `ApiExceptionFilter` (o `ThrottlerException` ja
 * nasce com status 429).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisThrottlerModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        storage,
        throttlers: [{ name: 'default', limit: DEFAULT_LIMIT, ttl: 60_000 }],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
