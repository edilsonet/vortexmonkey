import { describe, expect, it } from 'vitest';
import { INCREMENT_SCRIPT, RedisThrottlerStorage } from './redis-throttler.storage';
import type { RedisService } from '../redis/redis.service';

/** Duble do RedisService: registra a chamada e devolve um resultado controlado. */
function fakeRedis(result: unknown, fail = false) {
  const calls: Array<{ script: string; keys: readonly string[]; args: readonly (string | number)[] }> = [];
  const service = {
    async eval(script: string, keys: readonly string[], args: readonly (string | number)[]) {
      calls.push({ script, keys, args });
      if (fail) throw new Error('redis fora');
      return result;
    },
  } as unknown as RedisService;
  return { service, calls };
}

describe('RedisThrottlerStorage', () => {
  it('traduz o retorno do Lua e usa chave prefixada por throttler', async () => {
    const { service, calls } = fakeRedis([3, 42, 0, 0]);
    const storage = new RedisThrottlerStorage(service);

    const record = await storage.increment('ip:1', 60_000, 10, 0, 'default');

    expect(record).toEqual({ totalHits: 3, timeToExpire: 42, isBlocked: false, timeToBlockExpire: 0 });
    expect(calls[0]?.script).toBe(INCREMENT_SCRIPT);
    expect(calls[0]?.keys).toEqual(['throttle:default:ip:1', 'throttle:default:ip:1:block']);
    expect(calls[0]?.args).toEqual([60_000, 10, 0]);
  });

  it('marca bloqueio quando o Lua devolve isBlocked=1', async () => {
    const { service } = fakeRedis(['11', '30', '1', '30']);
    const storage = new RedisThrottlerStorage(service);

    const record = await storage.increment('ip:2', 60_000, 10, 60_000, 'default');

    expect(record).toEqual({ totalHits: 11, timeToExpire: 30, isBlocked: true, timeToBlockExpire: 30 });
  });

  it('segue em fail-open quando o Redis falha', async () => {
    const { service } = fakeRedis(null, true);
    const storage = new RedisThrottlerStorage(service);

    const record = await storage.increment('ip:3', 60_000, 10, 0, 'default');

    expect(record).toEqual({ totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 });
  });
});
