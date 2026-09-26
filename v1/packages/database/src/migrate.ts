import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const readSecret = async (path: string | undefined, fallback?: string): Promise<string> => {
  if (path) return (await readFile(path, 'utf8')).trim();
  if (fallback) return fallback;
  throw new Error('Secret obrigatório não configurado.');
};

const safeIdentifier = (value: string): string => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Identificador SQL inválido: ${value}`);
  return value;
};

const main = async (): Promise<void> => {
  const adminPassword = await readSecret(process.env.DB_ADMIN_PASSWORD_FILE, process.env.DB_ADMIN_PASSWORD);
  const appPassword = await readSecret(process.env.DB_APP_PASSWORD_FILE, process.env.DB_APP_PASSWORD);
  const appUser = safeIdentifier(process.env.DB_APP_USER ?? 'vortex_app');
  const pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_ADMIN_USER ?? 'vortex_admin',
    password: adminPassword,
  });
  const escapedPassword = appPassword.replaceAll("'", "''");
  await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appUser}') THEN CREATE ROLE ${appUser} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${escapedPassword}'; ELSE ALTER ROLE ${appUser} PASSWORD '${escapedPassword}'; END IF; END $$;`);
  await pool.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const migrationDir = resolve(process.cwd(), 'packages/database/migrations');
  const names = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of names) {
    const exists = await pool.query<{ name: string }>('SELECT name FROM public.schema_migrations WHERE name = $1', [name]);
    if (exists.rowCount) continue;
    const sql = await readFile(resolve(migrationDir, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Aplicada: ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  await pool.end();
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
