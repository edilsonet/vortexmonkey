import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { lastValueFrom, Observable } from 'rxjs';
import { RedisService } from '../redis/redis.service';

interface IdempotencyRecord { requestHash: string; response: unknown }

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(private readonly redis: RedisService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.originalUrl.startsWith('/api/v1/auth/')) return next.handle();
    return this.execute(request, next);
  }

  private async execute(request: Request, next: CallHandler): Promise<Observable<unknown>> {
    const key = request.header('idempotency-key');
    if (!key || key.length < 16 || key.length > 128) {
      throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency-Key é obrigatório e deve ter entre 16 e 128 caracteres.' });
    }
    const userId = request.vortexContext?.userId ?? 'anonymous';
    const storageKey = `idempotency:${userId}:${key}`;
    const requestHash = createHash('sha256').update(JSON.stringify({ method: request.method, path: request.originalUrl, body: request.body })).digest('hex');
    const previous = await this.redis.get(storageKey);
    if (previous) {
      const record = JSON.parse(previous) as IdempotencyRecord;
      if (record.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'A chave já foi usada com outro conteúdo.' });
      return new Observable((subscriber) => { subscriber.next(record.response); subscriber.complete(); });
    }
    const lockKey = `${storageKey}:lock`;
    const locked = await this.redis.acquire(lockKey, 30);
    if (!locked) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Uma requisição com esta chave está em processamento.' });
    try {
      const value = await lastValueFrom(next.handle());
      await this.redis.set(storageKey, JSON.stringify({ requestHash, response: value } satisfies IdempotencyRecord), 86_400);
      return new Observable((subscriber) => { subscriber.next(value); subscriber.complete(); });
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
