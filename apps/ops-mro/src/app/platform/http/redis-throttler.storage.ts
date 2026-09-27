import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';

/**
 * Forma do registro devolvido pelo contador. Replicada aqui porque o pacote
 * nao reexporta o tipo `ThrottlerStorageRecord` no seu barrel.
 */
interface RateLimitRecord {
  readonly totalHits: number;
  readonly timeToExpire: number;
  readonly isBlocked: boolean;
  readonly timeToBlockExpire: number;
}

/**
 * Contador de janela fixa em Redis (`INCR` + `PEXPIRE` no mesmo script Lua).
 *
 * O contador precisa sobreviver a reinicio e valer para TODO o app: com varias
 * replicas da API, um mapa em memoria contaria por processo e o limite real
 * seria multiplicado. A janela fixa e suficiente para conter abuso de forca
 * bruta; bloqueio prolongado (`blockDuration`) tambem e suportado.
 *
 * O Redis e compartilhado com a idempotencia (regra 6); as chaves do rate limit
 * levam o prefixo `throttle:` para nao colidirem.
 */
export const INCREMENT_SCRIPT = `
local key = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local hits = tonumber(redis.call('GET', key) or '0')
  local seconds = math.ceil(blockTtl / 1000)
  return { hits, seconds, 1, seconds }
end

local hits = redis.call('INCR', key)
if hits == 1 then
  redis.call('PEXPIRE', key, ttl)
end
local timeToExpire = math.ceil(redis.call('PTTL', key) / 1000)

if hits > limit and blockDuration > 0 then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  local seconds = math.ceil(blockDuration / 1000)
  return { hits, timeToExpire, 1, seconds }
end

return { hits, timeToExpire, 0, 0 }
`.trim();

/** Prefixo das chaves; separa o rate limit do restante do espaco de chaves. */
const KEY_PREFIX = 'throttle:';

/** Lua devolve numeros em `number` (ioredis) ou string; normaliza para inteiro. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  public constructor(private readonly redis: RedisService) {}

  public async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<RateLimitRecord> {
    const storageKey = `${KEY_PREFIX}${throttlerName}:${key}`;
    let raw: unknown;
    try {
      raw = await this.redis.eval(INCREMENT_SCRIPT, [storageKey, `${storageKey}:block`], [
        ttl,
        limit,
        blockDuration,
      ]);
    } catch (error) {
      // Falha do Redis nao pode derrubar a API: sem contador, a requisicao
      // segue (fail-open) - a idempotencia continua sendo a barreira de escrita.
      this.logger.warn(
        `Rate limit sem Redis (${throttlerName}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
    }
    if (!Array.isArray(raw)) {
      return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
    }
    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = raw;
    return {
      totalHits: toNumber(totalHits),
      timeToExpire: toNumber(timeToExpire),
      isBlocked: toNumber(isBlocked) === 1,
      timeToBlockExpire: toNumber(timeToBlockExpire),
    };
  }
}

/**
 * Torna o storage visivel ao `ThrottlerModule.forRootAsync` (que so enxerga o
 * que estiver no seu proprio `imports`).
 */
@Global()
@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class RedisThrottlerModule {}
