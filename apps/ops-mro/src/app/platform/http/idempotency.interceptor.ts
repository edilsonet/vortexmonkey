import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { lastValueFrom, Observable, of } from 'rxjs';
import { RedisService } from '../redis/redis.service';

interface IdempotencyRecord {
  readonly requestHash: string;
  readonly response: unknown;
}

const TTL_SECONDS = 86_400;

/**
 * Idempotencia de escrita (regra 6): rotas de mutacao exigem `Idempotency-Key`
 * (16..128 chars). Repetir a mesma chave com o mesmo corpo devolve a resposta
 * original sem reexecutar o dominio; repetir com corpo diferente e conflito.
 * A trava (`NX`) evita duas execucoes concorrentes da mesma chave.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(private readonly redis: RedisService) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next.handle();
    return this.execute(request, next);
  }

  private async execute(request: Request, next: CallHandler): Promise<Observable<unknown>> {
    const key = request.header('idempotency-key');
    if (!key || key.length < 16 || key.length > 128) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency-Key e obrigatorio e deve ter entre 16 e 128 caracteres.',
      });
    }
    const userId = request.vortexContext?.userId ?? 'anonymous';
    const storageKey = `idempotency:${userId}:${key}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ method: request.method, path: request.originalUrl, body: request.body }))
      .digest('hex');

    const previous = await this.redis.get(storageKey);
    if (previous) {
      const record = JSON.parse(previous) as IdempotencyRecord;
      if (record.requestHash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A chave ja foi usada com outro conteudo.',
        });
      }
      return of(record.response);
    }

    const lockKey = `${storageKey}:lock`;
    const locked = await this.redis.acquire(lockKey, 30);
    if (!locked) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Uma requisicao com esta chave esta em processamento.',
      });
    }
    try {
      const value = await lastValueFrom(next.handle());
      await this.redis.set(storageKey, JSON.stringify({ requestHash, response: value }), TTL_SECONDS);
      return of(value);
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
