const endpoint = process.env.VORTEX_API_URL ?? 'http://localhost:3000';
const tenantId = process.env.VORTEX_TENANT_ID;
if (!tenantId) throw new Error('VORTEX_TENANT_ID é obrigatório.');
const response = await fetch(`${endpoint}/api/v1/ledger/verify`, { headers: { authorization: `Bearer ${process.env.VORTEX_TOKEN ?? ''}`, 'x-tenant-id': tenantId } });
if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2));
