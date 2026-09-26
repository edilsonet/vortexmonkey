import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import type { Request } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { IdempotencyInterceptor } from './idempotency.interceptor';

class FakeRedis {
  private readonly values = new Map<string, string>();
  private readonly locks = new Set<string>();
  public async get(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  public async set(key: string, value: string): Promise<void> { this.values.set(key, value); }
  public async del(key: string): Promise<void> { this.locks.delete(key); }
  public async acquire(key: string): Promise<boolean> { if (this.locks.has(key)) return false; this.locks.add(key); return true; }
}

const context = (body: unknown): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({
    method: 'POST', originalUrl: '/api/v1/identity/profiles', body,
    header: (name: string) => name.toLowerCase() === 'idempotency-key' ? '12345678-1234-4234-8234-123456789012' : undefined,
    vortexContext: { userId: 'user-1' },
  } as unknown as Request) }),
} as unknown as ExecutionContext);

const execute = async (interceptor: IdempotencyInterceptor, ctx: ExecutionContext, handler: CallHandler): Promise<unknown> => {
  const output = await interceptor.intercept(ctx, handler);
  return lastValueFrom(await output);
};

describe('IdempotencyInterceptor', () => {
  it('reexecuta a resposta armazenada sem duplicar o handler', async () => {
    const redis = new FakeRedis();
    const interceptor = new IdempotencyInterceptor(redis as never);
    const handler = { handle: vi.fn(() => of({ id: 'profile-1' })) };
    expect(await execute(interceptor, context({ professionalType: 'PILOTO' }), handler)).toEqual({ id: 'profile-1' });
    expect(await execute(interceptor, context({ professionalType: 'PILOTO' }), handler)).toEqual({ id: 'profile-1' });
    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('recusa a mesma chave com outro conteúdo', async () => {
    const redis = new FakeRedis();
    const interceptor = new IdempotencyInterceptor(redis as never);
    await execute(interceptor, context({ professionalType: 'PILOTO' }), { handle: () => of({ id: 'profile-1' }) });
    await expect(execute(interceptor, context({ professionalType: 'MMA' }), { handle: () => of({ id: 'profile-2' }) })).rejects.toBeInstanceOf(ConflictException);
  });
});
