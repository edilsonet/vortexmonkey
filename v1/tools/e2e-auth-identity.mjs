import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VORTEX_API_URL ?? 'http://127.0.0.1:3000';
const password = (await readFile('/tmp/vortex-test-password', 'utf8')).trim();
const tenantId = '20000000-0000-4000-8000-000000000001';
const companyId = '20000000-0000-4000-8000-000000000003';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body.data;
};

const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@vortex.local', password }) });
if (!login.accessToken || !login.refreshToken) throw new Error('Login não retornou os dois tokens.');
const authHeaders = { authorization: `Bearer ${login.accessToken}`, 'x-tenant-id': tenantId, 'x-company-id': companyId };
const me = await request('/api/v1/identity/me', { headers: authHeaders });
if (me.id !== '20000000-0000-4000-8000-000000000002') throw new Error('Identidade autenticada inesperada.');

const idempotencyKey = randomUUID();
const portariaNumber = `E2E-${Date.now()}`;
const writeOptions = {
  method: 'POST', headers: { ...authHeaders, 'idempotency-key': idempotencyKey },
  body: JSON.stringify({ accreditationType: 'PCA', portariaNumber, issueDate: '2026-09-05', scope: ['GRUPO_B_MEDIO_PORTE'] }),
};
const first = await request('/api/v1/identity/accreditations', writeOptions);
const second = await request('/api/v1/identity/accreditations', writeOptions);
if (first.id !== second.id) throw new Error('Idempotência falhou: IDs divergentes.');
const ledgerVerification = await request('/api/v1/ledger/verify', { headers: authHeaders });
if (!ledgerVerification.valid) throw new Error(`Ledger inválido: ${JSON.stringify(ledgerVerification.issues)}`);

const refreshed = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: login.refreshToken }) });
const refreshedMe = await request('/api/v1/identity/me', { headers: { ...authHeaders, authorization: `Bearer ${refreshed.accessToken}` } });
if (refreshedMe.id !== me.id) throw new Error('Refresh mudou a identidade do usuário.');
await request('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refreshed.refreshToken }) });

const report = {
  login: 'ok', tenantContext: tenantId, companyContext: companyId, userId: me.id,
  accreditationId: first.id, ledgerBlockId: first.ledger_block_id, validUntil: first.valid_until,
  idempotency: first.id === second.id ? 'ok' : 'failed', ledgerVerification, refreshRotation: 'ok', logout: 'ok',
};
await writeFile('/tmp/vortex-e2e-result.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
