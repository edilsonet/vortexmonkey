import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { readSecret } from '@vortex/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client = new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1', port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.NODE_ENV === 'test' && !process.env.REDIS_PASSWORD_FILE ? undefined : readSecret('REDIS_PASSWORD_FILE', 'REDIS_PASSWORD'),
    lazyConnect: true, maxRetriesPerRequest: 2,
  });
  public async connect(): Promise<void> { if (this.client.status === 'wait') await this.client.connect(); }
  public async get(key: string): Promise<string | null> { await this.connect(); return this.client.get(key); }
  public async set(key: string, value: string, seconds: number): Promise<void> { await this.connect(); await this.client.set(key, value, 'EX', seconds); }
  public async del(key: string): Promise<void> { await this.connect(); await this.client.del(key); }
  public async acquire(key: string, seconds: number): Promise<boolean> { await this.connect(); return (await this.client.set(key, '1', 'EX', seconds, 'NX')) === 'OK'; }
  public async incrementWindow(key: string, seconds: number): Promise<number> { await this.connect(); const multi = this.client.multi().incr(key).expire(key, seconds, 'NX'); const result = await multi.exec(); return Number(result?.[0]?.[1] ?? 0); }
  public async ping(): Promise<string> { await this.connect(); return this.client.ping(); }
  public async onApplicationShutdown(): Promise<void> { if (this.client.status !== 'end') await this.client.quit(); }
}
