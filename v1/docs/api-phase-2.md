# API e SDK — Fase 2

Todas as respostas usam o envelope global `{ success, data, error }`. Rotas autenticadas exigem `Authorization: Bearer`, `X-Tenant-ID` e, quando aplicável, `X-Company-ID`. Escritas exigem `Idempotency-Key`.

## Rotas

| Método | Rota | Escopo | Finalidade |
|---|---|---|---|
| `POST` | `/api/v1/ledger/append` | `ledger:append` + papel `SYSTEM` | Append interno controlado |
| `GET` | `/api/v1/ledger/:entityId` | `ledger:read` | Eventos de uma entidade |
| `GET` | `/api/v1/ledger/:entityId/diff` | `ledger:read` | Eventos e estado reconstruído |
| `GET` | `/api/v1/ledger/verify` | `ledger:read` | Verificação sem mutação |
| `GET` | `/api/v1/ledger/export/merkle` | `ledger:export` | Prova Merkle JSON assinada |
| `POST` | `/api/v1/protocols` | `protocol:write` | Criar protocolo |
| `GET` | `/api/v1/protocols/:id` | `protocol:read` | Consultar protocolo autorizado |
| `POST` | `/api/v1/protocols/:id/events` | `protocol:write` | Acrescentar evento imutável |
| `GET` | `/api/v1/protocols/:id/timeline` | `protocol:read` | Consultar timeline autorizada |
| `POST` | `/api/v1/protocols/:id/vista` | `protocol:view:request` | Solicitar vista |
| `POST` | `/api/v1/protocols/views/:viewId/decision` | `protocol:view:decide` | Conceder ou negar vista |
| `GET` | `/api/v1/public/search` | pública | Consultar apenas processos públicos sem dado pessoal |
| `GET` | `/api/v1/audit` | `audit:read` | Filtrar auditoria por entidade, usuário e período |

## Criação de protocolo

```http
POST /api/v1/protocols
Authorization: Bearer <token>
X-Tenant-ID: <uuid>
X-Company-ID: <uuid>
Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "entityId": "4b9ec125-0b64-46f5-bb25-694c7c122e27",
  "entityType": "REGULATORY_PROCESS",
  "subject": "Análise de processo operacional",
  "accessLevel": "RESTRICTED",
  "restrictionBasis": "LGPD_PERSONAL_DATA",
  "containsPersonalData": true
}
```

O retorno inclui `protocol_number`, no formato `AAAA-NNNNNN`.

## Auditoria

```http
GET /api/v1/audit?entityId=<uuid>&userId=<uuid>&from=2026-09-01T00:00:00Z&to=2026-09-30T23:59:59Z&limit=100
```

Os filtros são opcionais. O limite máximo é 500.

## SDK

`@vortex/sdk` injeta token, tenant, empresa e chave de idempotência. A Fase 2 adiciona `createProtocol`, `protocol`, `timeline`, `requestProtocolView`, `decideProtocolView`, `publicSearch`, `audit`, `verifyLedger` e `exportMerkle`.

```ts
const client = new VortexClient({
  baseUrl: 'https://api.vortex.example',
  accessToken: () => token,
  tenantId: () => tenantId,
  companyId: () => companyId,
});

const result = await client.createProtocol({
  entityId,
  entityType: 'REGULATORY_PROCESS',
  subject: 'Análise técnica',
  accessLevel: 'PUBLIC',
  containsPersonalData: false,
});
```
