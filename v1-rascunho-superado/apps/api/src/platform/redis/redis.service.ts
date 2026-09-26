import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import { loadConfig } from "@vortex/config";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly memory = new Map<string, { value: string; expiresAt: number }>();
  private client: Redis | null = null;

  public constructor() {
    try {
      this.client = new Redis(loadConfig().redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      void this.client.connect().catch(() => {
        this.client = null;
      });
    } catch {
      this.client = null;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  public async get(key: string): Promise<string | null> {
    if (this.client) {
      try {
        return await this.client.get(key);
      } catch {
        /* fallback */
      }
    }
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.client) {
      try {
        await this.client.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        /* fallback */
      }
    }
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
