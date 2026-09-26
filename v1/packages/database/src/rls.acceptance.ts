import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const secret = async (fileKey: string, valueKey: string): Promise<string> => {
  const path = process.env[fileKey];
  if (path) return (await readFile(path, 'utf8')).trim();
  const value = process.env[valueKey];
  if (!value) throw new Error(`${fileKey} ou ${valueKey} é obrigatório.`);
  return value;
};

const config = async (admin: boolean) => ({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'vortex',
  user: admin ? (process.env.DB_ADMIN_USER ?? 'vortex_admin') : (process.env.DB_APP_USER ?? 'vortex_app'),
  password: await secret(admin ? 'DB_ADMIN_PASSWORD_FILE' : 'DB_APP_PASSWORD_FILE', admin ? 'DB_ADMIN_PASSWORD' : 'DB_APP_PASSWORD'),
});

const main = async (): Promise<void> => {
  const admin = new Pool(await config(true));
  const app = new Pool(await config(false));
  const tenantId = randomUUID();
  const companyId = randomUUID();
  const memberId = randomUUID();
  const outsiderId = randomUUID();
  try {
    await admin.query('BEGIN');
    await admin.query("INSERT INTO identity.tenants(id,name,type) VALUES ($1,'Teste RLS','ERP')", [tenantId]);
    await admin.query("INSERT INTO identity.users(id,cpf,full_name,email) VALUES ($1,'52998224725','Membro RLS',$2),($3,'16899535009','Sem vínculo RLS',$4)", [memberId, `member-${memberId}@example.test`, outsiderId, `outsider-${outsiderId}@example.test`]);
    await admin.query("INSERT INTO identity.companies(id,cnpj,corporate_name) VALUES ($1,'11222333000181','Empresa RLS')", [companyId]);
    await admin.query("INSERT INTO identity.tenant_users(tenant_id,user_id,role,status) VALUES ($1,$2,'ADMIN','ACTIVE'),($1,$3,'RCONTA','ACTIVE')", [tenantId, memberId, outsiderId]);
    await admin.query('INSERT INTO identity.tenant_companies(tenant_id,company_id) VALUES ($1,$2)', [tenantId, companyId]);
    await admin.query("INSERT INTO identity.relationships(tenant_id,user_id,company_id,role,status,starts_at,created_by) VALUES ($1,$2,$3,'ADMIN','ACTIVE',now(),$2)", [tenantId, memberId, companyId]);
    await admin.query('COMMIT');

    const withoutRelationship = await app.connect();
    try {
      await withoutRelationship.query('BEGIN');
      await withoutRelationship.query("SELECT set_config('app.current_user_id',$1,true), set_config('app.current_tenant_id',$2,true)", [outsiderId, tenantId]);
      const result = await withoutRelationship.query('SELECT id FROM identity.companies');
      if (result.rowCount !== 0) throw new Error('RLS falhou: usuário sem vínculo visualizou empresa.');
      await withoutRelationship.query('ROLLBACK');
    } finally { withoutRelationship.release(); }

    const withRelationship = await app.connect();
    try {
      await withRelationship.query('BEGIN');
      await withRelationship.query("SELECT set_config('app.current_user_id',$1,true), set_config('app.current_tenant_id',$2,true)", [memberId, tenantId]);
      const result = await withRelationship.query('SELECT id FROM identity.companies WHERE id = $1', [companyId]);
      if (result.rowCount !== 1) throw new Error('RLS falhou: membro ativo não visualizou a própria empresa.');
      await withRelationship.query('ROLLBACK');
    } finally { withRelationship.release(); }
    console.log('RLS aprovado: usuário sem vínculo vê zero empresas; membro ativo vê uma empresa.');
  } finally {
    await admin.query('DELETE FROM identity.relationships WHERE tenant_id = $1', [tenantId]);
    await admin.query('DELETE FROM identity.tenant_companies WHERE tenant_id = $1', [tenantId]);
    await admin.query('DELETE FROM identity.tenant_users WHERE tenant_id = $1', [tenantId]);
    await admin.query('DELETE FROM identity.companies WHERE id = $1', [companyId]);
    await admin.query('DELETE FROM identity.users WHERE id = ANY($1::uuid[])', [[memberId, outsiderId]]);
    await admin.query('DELETE FROM identity.tenants WHERE id = $1', [tenantId]);
    await app.end();
    await admin.end();
  }
};

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
