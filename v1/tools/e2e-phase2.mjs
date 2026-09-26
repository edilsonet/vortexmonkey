import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VORTEX_API_URL ?? 'http://127.0.0.1:3000';
const password = (await readFile('/tmp/vortex-test-password', 'utf8')).trim();
const tenantId = '20000000-0000-4000-8000-000000000001';
const companyId = '20000000-0000-4000-8000-000000000003';
const marker = `F2-${Date.now()}-${randomBytes(3).toString('hex')}`;

const rawRequest = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  const body = await response.json();
  return { status: response.status, ok: response.ok, body };
};
const request = async (path, options = {}) => {
  const result = await rawRequest(path, options);
  if (!result.ok) throw new Error(`${result.status} ${path}: ${JSON.stringify(result.body)}`);
  return result.body.data;
};
const post = (path, body, headers, idempotencyKey = randomUUID()) => request(path, {
  method: 'POST', headers: { ...headers, 'idempotency-key': idempotencyKey }, body: JSON.stringify(body),
});

const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@vortex.local', password }) });
const auth = { authorization: `Bearer ${login.accessToken}`, 'x-tenant-id': tenantId, 'x-company-id': companyId };

const publicInput = { entityId: randomUUID(), entityType: 'REGULATORY_PROCESS', subject: `${marker} público`, accessLevel: 'PUBLIC', containsPersonalData: false };
const idempotencyKey = randomUUID();
const publicProtocol = await post('/api/v1/protocols', publicInput, auth, idempotencyKey);
const replayed = await post('/api/v1/protocols', publicInput, auth, idempotencyKey);
if (publicProtocol.id !== replayed.id) throw new Error('Idempotência do protocolo retornou IDs diferentes.');

const restrictedProtocol = await post('/api/v1/protocols', {
  entityId: randomUUID(), entityType: 'REGULATORY_PROCESS', subject: `${marker} restrito`, accessLevel: 'RESTRICTED',
  restrictionBasis: 'LGPD_PERSONAL_DATA', containsPersonalData: true,
}, auth);

const invalid = await rawRequest('/api/v1/protocols', {
  method: 'POST', headers: { ...auth, 'idempotency-key': randomUUID() },
  body: JSON.stringify({ entityId: randomUUID(), entityType: 'REGULATORY_PROCESS', subject: `${marker} inválido`, accessLevel: 'PUBLIC', containsPersonalData: true }),
});
if (invalid.status !== 422) throw new Error(`Dado pessoal público deveria retornar 422, retornou ${invalid.status}.`);

const concurrent = await Promise.all(Array.from({ length: 32 }, (_, index) => post('/api/v1/protocols', {
  entityId: randomUUID(), entityType: 'LOAD_TEST', subject: `${marker} concorrência ${index}`, accessLevel: 'PUBLIC', containsPersonalData: false,
}, auth)));
const numbers = concurrent.map((item) => item.protocol_number);
if (new Set(numbers).size !== numbers.length || numbers.some((number) => !/^\d{4}-\d{6}$/.test(number))) throw new Error('Colisão ou formato inválido na numeração concorrente.');

await post(`/api/v1/protocols/${publicProtocol.id}/events`, {
  eventType: 'STATUS_CHANGED', description: 'Processo encaminhado para análise técnica.',
  payload: { changes: [{ field_path: 'status', old_value: 'OPEN', new_value: 'IN_REVIEW' }] }, accessLevel: 'PUBLIC',
}, auth);
const timeline = await request(`/api/v1/protocols/${publicProtocol.id}/timeline`, { headers: auth });
if (timeline.length !== 2 || timeline[0].event_type !== 'PROTOCOL_CREATED') throw new Error('Timeline não preservou os dois eventos esperados.');

const view = await post(`/api/v1/protocols/${restrictedProtocol.id}/vista`, { justification: 'Necessidade de análise técnica e documental do processo.' }, auth);
const responseDays = Math.round((new Date(view.response_due_at).getTime() - new Date(view.requested_at).getTime()) / 86_400_000);
if (responseDays !== 5) throw new Error(`Prazo de resposta da vista divergente: ${responseDays}.`);
const decided = await post(`/api/v1/protocols/views/${view.id}/decision`, { decision: 'GRANTED', reason: 'Vista concedida ao solicitante vinculado.' }, auth);
const accessDays = Math.round((new Date(decided.granted_until).getTime() - new Date(decided.decided_at).getTime()) / 86_400_000);
if (accessDays !== 10) throw new Error(`Prazo de acesso da vista divergente: ${accessDays}.`);

const publicSearch = await request(`/api/v1/public/search?q=${encodeURIComponent(marker)}`);
if (!publicSearch.some((item) => item.protocol_number === publicProtocol.protocol_number)) throw new Error('Protocolo público não apareceu na consulta pública.');
if (publicSearch.some((item) => item.protocol_number === restrictedProtocol.protocol_number)) throw new Error('A consulta pública vazou protocolo restrito.');

const entityDiff = await request(`/api/v1/ledger/${publicProtocol.id}/diff`, { headers: auth });
if (entityDiff.currentState.protocolNumber !== publicProtocol.protocol_number) throw new Error('Reconstrução por diff não retornou o protocolo esperado.');

const verification = await request('/api/v1/ledger/verify', { headers: auth });
if (!verification.valid || verification.status !== 'VALID') throw new Error(`Ledger inválido: ${JSON.stringify(verification.issues)}`);
const merkle = await request('/api/v1/ledger/export/merkle', { headers: auth });
if (!merkle.rootHash || !merkle.rootSignature || merkle.blockCount < 1) throw new Error('Exportação Merkle incompleta.');
const firstLeaf = merkle.leaves[0];
let computed = firstLeaf.hash;
for (const step of firstLeaf.proof) {
  const pair = step.position === 'LEFT' ? [step.hash, computed] : [computed, step.hash];
  computed = createHash('sha256').update(Buffer.concat(pair.map((hash) => Buffer.from(hash, 'hex')))).digest('hex');
}
if (computed !== merkle.rootHash) throw new Error('Prova de inclusão Merkle inválida.');

const audit = await request(`/api/v1/audit?from=${encodeURIComponent(new Date(Date.now() - 3_600_000).toISOString())}&limit=500`, { headers: auth });
if (!audit.some((item) => item.outcome === 'FAILURE' && item.status_code === 422)) throw new Error('Falha 422 não foi registrada na auditoria.');
if (!audit.every((item) => item.ledger_block_id)) throw new Error('Evento de auditoria sem âncora no ledger.');

const report = {
  marker,
  publicProtocol: publicProtocol.protocol_number,
  restrictedProtocol: restrictedProtocol.protocol_number,
  idempotency: 'ok',
  concurrentProtocols: numbers.length,
  uniqueConcurrentNumbers: new Set(numbers).size,
  timelineEvents: timeline.length,
  publicSearchResults: publicSearch.length,
  viewResponseDays: responseDays,
  viewAccessDays: accessDays,
  ledger: { valid: verification.valid, totalBlocks: verification.totalBlocks, lastHash: verification.lastHash },
  merkle: { blockCount: merkle.blockCount, rootHash: merkle.rootHash, proofVerified: computed === merkle.rootHash },
  auditEventsRead: audit.length,
  failedActionAudited: true,
};
await writeFile('/tmp/vortex-phase2-e2e-result.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
