import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { RequestContext } from '@vortex/shared-dto';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

/** Superficie minima usada pelos servicos: permite testar com um cliente falso. */
export type SqlClient = Pick<PoolClient, 'query'>;

/**
 * Acesso ao PostgreSQL. `withContext` abre a transacao e injeta o contexto do
 * usuario em `app.current_user_id`/`tenant`/`company`, que e o que as funcoes
 * `identity.current_*_ids()` leem para o Row-Level Security. Sem contexto
 * valido o RLS nao devolve linha alguma: e a garantia de "usuario sem vinculo
 * nao ve nada" (regra 3).
 */
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_APP_USER ?? 'vortex_app',
    password: process.env.DB_APP_PASSWORD ?? 'dev-app-password',
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  public async withContext<T>(
    context: RequestContext,
    callback: (client: SqlClient) => Promise<T>,
  ): Promise<T> {
    return this.withTransaction(async (client) => {
      await client.query(
        `SELECT set_config('app.current_user_id', $1, true),
                set_config('app.current_tenant_id', $2, true),
                set_config('app.current_company_id', $3, true)`,
        [context.userId, context.tenantId, context.companyId ?? ''],
      );
      return callback(client);
    });
  }

  /**
   * Transacao sem contexto de usuario. Usada por rotinas de plataforma (o
   * publicador do outbox) que operam via funcoes `SECURITY DEFINER` e nao
   * pertencem a um tenant.
   */
  public async withTransaction<T>(callback: (client: SqlClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await callback(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, [...values]);
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
