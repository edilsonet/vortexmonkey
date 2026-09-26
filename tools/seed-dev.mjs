#!/usr/bin/env node
/**
 * Seed de DESENVOLVIMENTO do VORTEX v4.
 *
 * Cria o minimo de identidade para exercitar RLS, ledger e idempotencia:
 * um tenant, uma empresa, um usuario com vinculo ATIVO e outro sem vinculo.
 * NAO e migracao: nao entra em `migrations/` nem em `schema_migrations`.
 *
 * Uso:
 *   node tools/seed-dev.mjs
 *
 * Variaveis: DB_HOST, DB_PORT, DB_NAME, DB_ADMIN_USER, DB_ADMIN_PASSWORD.
 */
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;

// Identificadores fixos para os testes referenciarem sem descobrir antes.
export const DEV_IDS = {
  tenant: '11111111-1111-1111-1111-111111111111',
  company: '22222222-2222-2222-2222-222222222222',
  ownerUser: '33333333-3333-3333-3333-333333333333',
  outsiderUser: '44444444-4444-4444-4444-444444444444',
  // Segundo membro da MESMA empresa: exercita chat entre usuarios distintos.
  employeeUser: '55555555-5555-4555-8555-555555555555',
};

// Fixture isolada, usada para verificar a cadeia do ledger sem herdar blocos
// assinados por uma chave de execucao anterior.
export const LEDGER_FIXTURE = {
  tenant: '11111111-1111-1111-1111-111111111112',
  company: '22222222-2222-2222-2222-222222222223',
  ownerUser: '33333333-3333-3333-3333-333333333334',
};

// Senha unica dos usuarios de desenvolvimento, para exercitar `POST /api/auth/login`.
// Nunca usar em producao: o seed e explicito de desenvolvimento.
export const DEV_PASSWORD = 'dev-password';

async function adminPassword() {
  const file = process.env.DB_ADMIN_PASSWORD_FILE;
  if (file) return (await readFile(file, 'utf8')).trim();
  return process.env.DB_ADMIN_PASSWORD ?? 'dev-admin-password';
}

async function main() {
  const { tenant, company, ownerUser, outsiderUser, employeeUser } = DEV_IDS;
  const pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_ADMIN_USER ?? 'vortex_admin',
    password: await adminPassword(),
  });

  await pool.query(
    `INSERT INTO identity.tenants(id, name, type) VALUES ($1, 'VORTEX Dev', 'MANUTENCAO')
     ON CONFLICT (id) DO NOTHING`,
    [tenant],
  );
  await pool.query(
    `INSERT INTO identity.companies(id, cnpj, corporate_name, trade_name, certificate_type, certificate_number)
     VALUES ($1, '00000000000191', 'Oficina Dev LTDA', 'Oficina Dev', 'OM', '145-0001')
     ON CONFLICT (id) DO NOTHING`,
    [company],
  );
  await pool.query(
    `INSERT INTO identity.users(id, cpf, full_name, email) VALUES
       ($1, '11111111111', 'Dono Dev', 'dono@vortex.dev'),
       ($2, '22222222222', 'Sem Vinculo', 'semvinculo@vortex.dev'),
       ($3, '55555555555', 'Mecanico Dev', 'mecanico.chat@vortex.dev')
     ON CONFLICT (id) DO NOTHING`,
    [ownerUser, outsiderUser, employeeUser],
  );
  await pool.query(
    `INSERT INTO identity.tenant_users(tenant_id, user_id, role, status) VALUES
       ($1, $2, 'ADMIN', 'ACTIVE'),
       ($1, $3, 'VISITANTE', 'ACTIVE'),
       ($1, $4, 'FUNCIONARIO', 'ACTIVE')
     ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [tenant, ownerUser, outsiderUser, employeeUser],
  );
  await pool.query(
    `INSERT INTO identity.tenant_companies(tenant_id, company_id) VALUES ($1, $2)
     ON CONFLICT (tenant_id, company_id) DO NOTHING`,
    [tenant, company],
  );
  await pool.query(
    `INSERT INTO identity.relationships(tenant_id, user_id, company_id, role, status, created_by)
     VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', $2)
     ON CONFLICT (tenant_id, user_id, company_id, role) DO NOTHING`,
    [tenant, ownerUser, company],
  );
  await pool.query(
    `INSERT INTO identity.relationships(tenant_id, user_id, company_id, role, status, created_by)
     VALUES ($1, $2, $3, 'FUNCIONARIO', 'ACTIVE', $4)
     ON CONFLICT (tenant_id, user_id, company_id, role) DO NOTHING`,
    [tenant, employeeUser, company, ownerUser],
  );

  await pool.query(
    `INSERT INTO identity.tenants(id, name, type) VALUES ($1, 'VORTEX Ledger Fixture', 'MANUTENCAO')
     ON CONFLICT (id) DO NOTHING`,
    [LEDGER_FIXTURE.tenant],
  );
  await pool.query(
    `INSERT INTO identity.companies(id, cnpj, corporate_name, trade_name)
     VALUES ($1, '00000000000192', 'Ledger Fixture LTDA', 'Ledger Fixture')
     ON CONFLICT (id) DO NOTHING`,
    [LEDGER_FIXTURE.company],
  );
  await pool.query(
    `INSERT INTO identity.users(id, cpf, full_name, email)
     VALUES ($1, '33333333333', 'Ledger Fixture', 'ledger@vortex.dev')
     ON CONFLICT (id) DO NOTHING`,
    [LEDGER_FIXTURE.ownerUser],
  );
  await pool.query(
    `INSERT INTO identity.tenant_users(tenant_id, user_id, role, status) VALUES ($1, $2, 'ADMIN', 'ACTIVE')
     ON CONFLICT (tenant_id, user_id) DO NOTHING`,
    [LEDGER_FIXTURE.tenant, LEDGER_FIXTURE.ownerUser],
  );
  await pool.query(
    `INSERT INTO identity.tenant_companies(tenant_id, company_id) VALUES ($1, $2)
     ON CONFLICT (tenant_id, company_id) DO NOTHING`,
    [LEDGER_FIXTURE.tenant, LEDGER_FIXTURE.company],
  );
  await pool.query(
    `INSERT INTO identity.relationships(tenant_id, user_id, company_id, role, status, created_by)
     VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', $2)
     ON CONFLICT (tenant_id, user_id, company_id, role) DO NOTHING`,
    [LEDGER_FIXTURE.tenant, LEDGER_FIXTURE.ownerUser, LEDGER_FIXTURE.company],
  );

  // Credenciais de login (bcrypt via pgcrypto). Idempotente: redefine a senha e
  // zera bloqueio a cada execucao.
  for (const user of [ownerUser, outsiderUser, employeeUser, LEDGER_FIXTURE.ownerUser]) {
    await pool.query('SELECT identity.set_password($1, $2)', [user, DEV_PASSWORD]);
  }

  console.log(
    'Seed aplicado:',
    JSON.stringify({ ...DEV_IDS, ledgerFixture: LEDGER_FIXTURE, password: DEV_PASSWORD }, null, 2),
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
