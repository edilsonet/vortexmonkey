import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import pg from "pg";
import { loadConfig } from "@vortex/config";
import type { RequestContext } from "@vortex/types";

export type SqlClient = pg.PoolClient;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: pg.Pool;

  public async onModuleInit(): Promise<void> {
    this.pool = new pg.Pool({ connectionString: loadConfig().databaseUrl });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  public query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  public async withContext<T>(ctx: RequestContext, fn: (client: SqlClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE vortex_app");
      await client.query("SELECT set_config('app.person_id', $1, true), set_config('app.tenant_id', $2, true)", [
        ctx.personId,
        ctx.tenantId ?? "",
      ]);
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async withTransaction<T>(fn: (client: SqlClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
