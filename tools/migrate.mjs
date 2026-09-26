#!/usr/bin/env node
/**
 * Runner de migrações do VORTEX v4.
 *
 * - Cria/atualiza o papel de aplicação `vortex_app` (NOSUPERUSER, NOBYPASSRLS:
 *   sem BYPASSRLS o RLS vale até para o dono das consultas).
 * - Aplica `migrations/*.sql` em ordem lexical, uma transação por arquivo,
 *   registrando em `public.schema_migrations`.
 *
 * Uso:
 *   node tools/migrate.mjs
 *   node tools/migrate.mjs --status
 *
 * Variáveis: DB_HOST, DB_PORT, DB_NAME, DB_ADMIN_USER, DB_ADMIN_PASSWORD
 * (ou DB_ADMIN_PASSWORD_FILE), DB_APP_USER, DB_APP_PASSWORD
 * (ou DB_APP_PASSWORD_FILE).
 *
 * Sem DB_APP_PASSWORD explícito o papel `vortex_app` NÃO tem a senha alterada —
 * evita que uma migração normal derrube a credencial de runtime por engano.
 * Ao criar o papel pela primeira vez sem senha informada, usa a senha do admin
 * apenas como conveniência de desenvolvimento e avisa.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function readSecret(fileVar, valueVar, fallback) {
  const file = process.env[fileVar];
  if (file) return (await readFile(file, 'utf8')).trim();
  const value = process.env[valueVar];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Segredo obrigatório não configurado: ${fileVar} ou ${valueVar}.`);
}

function safeIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Identificador SQL inválido: ${value}`);
  return value;
}

async function main() {
  const appUser = safeIdentifier(process.env.DB_APP_USER ?? 'vortex_app');
  const adminPassword = await readSecret('DB_ADMIN_PASSWORD_FILE', 'DB_ADMIN_PASSWORD');
  const appPassword = await readSecret('DB_APP_PASSWORD_FILE', 'DB_APP_PASSWORD', null);

  const pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_ADMIN_USER ?? 'vortex_admin',
    password: adminPassword,
  });

  const roleExists =
    (await pool.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser])).rowCount > 0;
  if (appPassword !== null) {
    const escapedPassword = appPassword.replaceAll("'", "''");
    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appUser}') THEN
           CREATE ROLE ${appUser} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${escapedPassword}';
         ELSE
           ALTER ROLE ${appUser} PASSWORD '${escapedPassword}';
         END IF;
       END $$;`,
    );
  } else if (!roleExists) {
    const escapedPassword = adminPassword.replaceAll("'", "''");
    await pool.query(
      `CREATE ROLE ${appUser} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${escapedPassword}'`,
    );
    console.warn(
      `Aviso: papel ${appUser} criado com a senha do admin (DB_APP_PASSWORD nao informado). ` +
        'Defina DB_APP_PASSWORD para alinhar com o runtime.',
    );
  } else {
    console.log(`Papel ${appUser} ja existe; senha preservada (DB_APP_PASSWORD nao informado).`);
  }
  await pool.query(
    'CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );

  const names = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  const applied = new Set(
    (await pool.query('SELECT name FROM public.schema_migrations')).rows.map((row) => row.name),
  );

  if (process.argv.includes('--status')) {
    for (const name of names) console.log(`${applied.has(name) ? 'APLICADA ' : 'PENDENTE '} ${name}`);
    await pool.end();
    return;
  }

  for (const name of names) {
    if (applied.has(name)) {
      console.log(`Ignorada (já aplicada): ${name}`);
      continue;
    }
    const sql = await readFile(resolve(MIGRATIONS_DIR, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Aplicada: ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Falha na migração ${name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
