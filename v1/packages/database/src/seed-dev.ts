import { scrypt as scryptCallback, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { Pool } from 'pg';

const scrypt = promisify(scryptCallback);
const ids = {
  tenant: '20000000-0000-4000-8000-000000000001',
  user: '20000000-0000-4000-8000-000000000002',
  company: '20000000-0000-4000-8000-000000000003',
  relationship: '20000000-0000-4000-8000-000000000004',
};

const readSecret = async (fileKey: string, valueKey: string): Promise<string> => {
  const path = process.env[fileKey];
  if (path) return (await readFile(path, 'utf8')).trim();
  const value = process.env[valueKey];
  if (!value) throw new Error(`${fileKey} ou ${valueKey} é obrigatório.`);
  return value;
};

const main = async (): Promise<void> => {
  const password = process.env.VORTEX_DEV_PASSWORD;
  if (!password || password.length < 12) throw new Error('VORTEX_DEV_PASSWORD é obrigatória e deve ter ao menos 12 caracteres.');
  const email = process.env.VORTEX_DEV_EMAIL ?? 'admin@vortex.local';
  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64) as Buffer).toString('hex');
  const pool = new Pool({
    host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 5432), database: process.env.DB_NAME ?? 'vortex',
    user: process.env.DB_ADMIN_USER ?? 'vortex_admin', password: await readSecret('DB_ADMIN_PASSWORD_FILE', 'DB_ADMIN_PASSWORD'),
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO identity.tenants(id,name,type) VALUES ($1,'VORTEX Desenvolvimento','ERP') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name", [ids.tenant]);
    await client.query("INSERT INTO identity.users(id,cpf,full_name,email) VALUES ($1,'11144477735','Administrador VORTEX',$2) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, full_name=EXCLUDED.full_name", [ids.user, email]);
    await client.query("INSERT INTO identity.companies(id,cnpj,corporate_name,trade_name) VALUES ($1,'12345678000195','VORTEX Aviação Civil Ltda.','VORTEX') ON CONFLICT (id) DO UPDATE SET corporate_name=EXCLUDED.corporate_name", [ids.company]);
    await client.query("INSERT INTO identity.tenant_users(tenant_id,user_id,role,status) VALUES ($1,$2,'ADMIN','ACTIVE') ON CONFLICT (tenant_id,user_id) DO UPDATE SET role='ADMIN', status='ACTIVE'", [ids.tenant, ids.user]);
    await client.query('INSERT INTO identity.tenant_companies(tenant_id,company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids.tenant, ids.company]);
    await client.query("INSERT INTO identity.relationships(id,tenant_id,user_id,company_id,role,scoped_modules,status,starts_at,created_by) VALUES ($1,$2,$3,$4,'ADMIN',ARRAY['rconta'],'ACTIVE',now(),$3) ON CONFLICT (id) DO UPDATE SET status='ACTIVE'", [ids.relationship, ids.tenant, ids.user, ids.company]);
    await client.query("INSERT INTO oauth.credentials(user_id,password_hash,salt) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,salt=EXCLUDED.salt,password_changed_at=now(),failed_attempts=0,locked_until=NULL", [ids.user, passwordHash, salt]);
    await client.query('COMMIT');
    console.log(`Seed local aplicado para ${email}; a senha permaneceu somente no ambiente do processo.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
