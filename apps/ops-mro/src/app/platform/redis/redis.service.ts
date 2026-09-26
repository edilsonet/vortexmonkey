import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cliente Redis para idempotencia (chave com TTL de 24h) e, adiante, rate
 * limit e sessao. Conexao preguicosa: so abre quando a primeira operacao pede,
 * o que mantem o `/health` independente do Redis.
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client = new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    // Vazio (compose sem senha) equivale a "sem AUTH"; ioredis tentaria AUTH com
    // string vazia se recebesse `''`.
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  private async connect(): Promise<void> {
    if (this.client.status === 'wait') await this.client.connect();
  }

  public async get(key: string): Promise<string | null> {
    await this.connect();
    return this.client.get(key);
  }

  public async set(key: string, value: string, seconds: number): Promise<void> {
    await this.connect();
    await this.client.set(key, value, 'EX', seconds);
  }

  public async del(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  /** Trava NX com expiracao: devolve true apenas para quem a obteve. */
  public async acquire(key: string, seconds: number): Promise<boolean> {
    await this.connect();
    return (await this.client.set(key, '1', 'EX', seconds, 'NX')) === 'OK';
  }

  public async ping(): Promise<string> {
    await this.connect();
    return this.client.ping();
  }

  public async onApplicationShutdown(): Promise<void> {
    if (this.client.status !== 'end') await this.client.quit();
  }
}
