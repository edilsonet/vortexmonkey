import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { readSecret } from '@vortex/config';
import type { RequestContext } from '@vortex/types';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

export type SqlClient = Pick<PoolClient, 'query'>;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex', user: process.env.DB_USER ?? 'vortex_app',
    password: process.env.NODE_ENV === 'test' && !process.env.DB_PASSWORD_FILE ? 'test' : readSecret('DB_PASSWORD_FILE', 'DB_PASSWORD'),
    max: 20, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
  });

  public async withContext<T>(context: RequestContext, callback: (client: SqlClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_user_id', $1, true), set_config('app.current_tenant_id', $2, true), set_config('app.current_company_id', $3, true)", [context.userId, context.tenantId, context.companyId ?? '']);
      const value = await callback(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  public query<T extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, [...values]);
  }

  public async onApplicationShutdown(): Promise<void> { await this.pool.end(); }
}
