#!/usr/bin/env node
/**
 * Bootstrap do ADMINISTRADOR de PRODUCAO do VORTEX v4.
 *
 * Numa VPS limpa nao existe usuario: `seed-dev.mjs` e de desenvolvimento e
 * `SEED_ON_BOOT=false` em producao, entao o login sempre retorna 401. Este
 * script cria a menor identidade funcional para o primeiro acesso:
 *   tenant -> empresa -> usuario -> vinculo ADMIN (tenant_users + relationship)
 *   -> credencial (bcrypt via `identity.set_password`).
 *
 * E IDEMPOTENTE: reexecutar nao duplica nada. A senha so e (re)definida quando
 * o usuario e criado agora ou quando `BOOTSTRAP_RESET_PASSWORD=true`.
 *
 * Uso:
 *   node tools/bootstrap-admin.mjs
 *   node tools/bootstrap-admin.mjs --check   # valida a entrada e sai sem gravar
 *
 * Variaveis (mesmo padrao do migrate/seed):
 *   DB_HOST, DB_PORT, DB_NAME, DB_ADMIN_USER, DB_ADMIN_PASSWORD
 *   (ou DB_ADMIN_PASSWORD_FILE)
 *
 * Entrada do bootstrap:
 *   ADMIN_EMAIL (obrigatorio), ADMIN_NAME (obrigatorio),
 *   ADMIN_CPF (obrigatorio, 11 digitos),
 *   ADMIN_PASSWORD (obrigatorio; ou ADMIN_PASSWORD_FILE),
 *   TENANT_NAME (obrigatorio), TENANT_TYPE (opcional; padrao MANUTENCAO),
 *   COMPANY_CNPJ (obrigatorio, 14 digitos), COMPANY_NAME (obrigatorio),
 *   COMPANY_TRADE_NAME (opcional),
 *   BOOTSTRAP_RESET_PASSWORD=true (opcional; redefine a senha de um admin
 *   existente).
 *
 * LACUNA CONHECIDA: como `seed-dev.mjs`, grava direto no schema `identity` sob
 * o papel admin e NAO cria bloco no ledger (nao ha contexto de requisicao nem a
 * cadeia de hashes do `ledger-service`). A criacao do primeiro administrador
 * deve ser registrada no ledger numa fase seguinte (evento de sistema).
 */
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;

const TENANT_TYPES = [
  'ERP',
  'RH',
  'CRM',
  'LOJA',
  'OPERADORES',
  'MANUTENCAO',
  'INSTRUCAO',
];

// Senhas obvias que nunca podem valer em producao.
const WEAK_PASSWORDS = new Set(['dev-password', 'troque-este-valor', 'password', 'changeme']);

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exit(1);
}

function required(name) {
  const value = (process.env[name] ?? '').trim();
  if (value === '') fail(`${name} nao configurado.`);
  return value;
}

function optional(name) {
  const value = (process.env[name] ?? '').trim();
  return value === '' ? undefined : value;
}

async function adminPassword() {
  const file = process.env.DB_ADMIN_PASSWORD_FILE;
  if (file) return (await readFile(file, 'utf8')).trim();
  return process.env.DB_ADMIN_PASSWORD ?? 'dev-admin-password';
}

async function bootstrapPassword() {
  const file = optional('ADMIN_PASSWORD_FILE');
  if (file) return (await readFile(file, 'utf8')).trim();
  return required('ADMIN_PASSWORD');
}

function assertDigits(value, length, label) {
  if (!new RegExp(`^[0-9]{${length}}$`).test(value)) {
    fail(`${label} invalido: esperado ${length} digitos numericos.`);
  }
}

function assertEmail(value) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) fail('ADMIN_EMAIL invalido.');
}

/** Politica de senha de producao: mais estrita que o minimo do banco (8). */
function assertStrongPassword(value) {
  if (value.length < 12) fail('ADMIN_PASSWORD deve ter ao menos 12 caracteres.');
  if (WEAK_PASSWORDS.has(value.toLowerCase())) fail('ADMIN_PASSWORD e uma senha obvia; troque-a.');
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (classes < 3) {
    fail('ADMIN_PASSWORD deve combinar ao menos 3 de: minusculas, maiusculas, digitos, simbolos.');
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const resetPassword = ['true', '1', 'yes'].includes(
    (process.env.BOOTSTRAP_RESET_PASSWORD ?? '').toLowerCase(),
  );

  const adminEmail = required('ADMIN_EMAIL');
  const adminName = required('ADMIN_NAME');
  const adminCpf = required('ADMIN_CPF');
  const tenantName = required('TENANT_NAME');
  const tenantType = optional('TENANT_TYPE') ?? 'MANUTENCAO';
  const companyCnpj = required('COMPANY_CNPJ');
  const companyName = required('COMPANY_NAME');
  const companyTradeName = optional('COMPANY_TRADE_NAME');

  assertEmail(adminEmail);
  assertDigits(adminCpf, 11, 'ADMIN_CPF');
  assertDigits(companyCnpj, 14, 'COMPANY_CNPJ');
  if (!TENANT_TYPES.includes(tenantType)) {
    fail(`TENANT_TYPE invalido: use um de ${TENANT_TYPES.join(', ')}.`);
  }
  const password = await bootstrapPassword();
  assertStrongPassword(password);

  if (checkOnly) {
    console.log('Entrada valida. Nada foi gravado (--check).');
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_ADMIN_USER ?? 'vortex_admin',
    password: await adminPassword(),
  });

  try {
    // 1. Tenant (nao tem chave natural alem do nome).
    const tenantFound = await pool.query('SELECT id FROM identity.tenants WHERE name = $1', [
      tenantName,
    ]);
    let tenantId = tenantFound.rows[0]?.id;
    if (tenantId === undefined) {
      tenantId = randomUUID();
      await pool.query('INSERT INTO identity.tenants(id, name, type) VALUES ($1, $2, $3)', [
        tenantId,
        tenantName,
        tenantType,
      ]);
      console.log(`Tenant criado: ${tenantName} (${tenantId}).`);
    } else {
      console.log(`Tenant ja existe: ${tenantName} (${tenantId}).`);
    }

    // 2. Empresa (chave natural: CNPJ).
    const companyFound = await pool.query('SELECT id FROM identity.companies WHERE cnpj = $1', [
      companyCnpj,
    ]);
    let companyId = companyFound.rows[0]?.id;
    if (companyId === undefined) {
      companyId = randomUUID();
      await pool.query(
        `INSERT INTO identity.companies(id, cnpj, corporate_name, trade_name)
         VALUES ($1, $2, $3, $4)`,
        [companyId, companyCnpj, companyName, companyTradeName ?? companyName],
      );
      console.log(`Empresa criada: ${companyName} (${companyId}).`);
    } else {
      console.log(`Empresa ja existe (CNPJ ${companyCnpj}): ${companyId}.`);
    }

    // 3. Usuario (chave natural: e-mail; CPF tambem e unico). Confere os dois
    //    para nao sobrescrever pessoa de outro e-mail com o mesmo CPF.
    const userFound = await pool.query(
      'SELECT id, cpf::text AS cpf FROM identity.users WHERE email = $1',
      [adminEmail],
    );
    let userId = userFound.rows[0]?.id;
    const userCreated = userId === undefined;
    if (userCreated) {
      const cpfOwner = await pool.query(
        'SELECT email::text AS email FROM identity.users WHERE cpf = $1',
        [adminCpf],
      );
      if (cpfOwner.rowCount > 0) {
        fail(`ADMIN_CPF ja pertence ao e-mail ${cpfOwner.rows[0].email}.`);
      }
      userId = randomUUID();
      await pool.query('INSERT INTO identity.users(id, cpf, full_name, email) VALUES ($1, $2, $3, $4)', [
        userId,
        adminCpf,
        adminName,
        adminEmail,
      ]);
      console.log(`Usuario criado: ${adminEmail} (${userId}).`);
    } else {
      const existingCpf = userFound.rows[0].cpf;
      if (existingCpf !== adminCpf) {
        fail(`ADMIN_EMAIL ja existe com outro CPF (${existingCpf}); ajuste ADMIN_CPF.`);
      }
      console.log(`Usuario ja existe: ${adminEmail} (${userId}).`);
    }

    // 4. Vinculos: tenant_users (habilita o login) + tenant_companies +
    //    relationship ADMIN ACTIVE (da tenant/empresa ao token).
    await pool.query(
      `INSERT INTO identity.tenant_users(tenant_id, user_id, role, status)
       VALUES ($1, $2, 'ADMIN', 'ACTIVE')
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, userId],
    );
    await pool.query(
      `INSERT INTO identity.tenant_companies(tenant_id, company_id) VALUES ($1, $2)
       ON CONFLICT (tenant_id, company_id) DO NOTHING`,
      [tenantId, companyId],
    );
    await pool.query(
      `INSERT INTO identity.relationships(tenant_id, user_id, company_id, role, status, created_by)
       VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', $2)
       ON CONFLICT (tenant_id, user_id, company_id, role) DO NOTHING`,
      [tenantId, userId, companyId],
    );

    // 5. Credencial: bcrypt via pgcrypto. So redefine em criacao ou reset
    //    explicito, para que reexecutar o bootstrap nao troque a senha viva.
    if (userCreated || resetPassword) {
      await pool.query('SELECT identity.set_password($1, $2)', [userId, password]);
      console.log(
        userCreated
          ? 'Credencial definida.'
          : 'Credencial REDEFINIDA (BOOTSTRAP_RESET_PASSWORD=true).',
      );
    } else {
      console.log('Credencial preservada (use BOOTSTRAP_RESET_PASSWORD=true para redefinir).');
    }

    console.log(
      'Bootstrap concluido:',
      JSON.stringify({ tenantId, companyId, userId, email: adminEmail }, null, 2),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
