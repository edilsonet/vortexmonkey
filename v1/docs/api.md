# API e SDK da Parte 1

**Autor:** Manus AI

## Contrato global

A API usa o prefixo `/api/v1`. Respostas bem-sucedidas e falhas são normalizadas pelos interceptors e filtros globais.

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Contexto de empresa não autorizado.",
    "request_id": "uuid"
  }
}
```

## Autenticação e contexto

O login emite access token JWT de 15 minutos e refresh token opaco de 30 dias. Apenas o hash SHA-256 do refresh token é armazenado. Cada renovação rotaciona o token anterior. Cinco falhas de senha bloqueiam a credencial por 15 minutos. A senha local é derivada com scrypt e salt aleatório.

Rotas protegidas recebem `Authorization: Bearer <token>`. O cliente seleciona o tenant em `X-Tenant-Id` e, quando necessário, a empresa em `X-Company-Id`. O guard recusa com HTTP 403 qualquer contexto que não conste dos vínculos ativos do token.

## Endpoints

| Método | Rota | Proteção | Finalidade |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Público, 10/min | Autenticar e emitir tokens |
| `POST` | `/api/v1/auth/refresh` | Público, 10/min | Rotacionar refresh token |
| `POST` | `/api/v1/auth/logout` | Público, 10/min | Revogar refresh token |
| `GET` | `/health` | Público | Saúde de PostgreSQL e Redis |
| `GET` | `/metrics` | Público no ambiente local | Métricas Prometheus |
| `GET` | `/api/v1/identity/me` | JWT + tenant | Identidade e memberships ativos |
| `POST` | `/api/v1/identity/profiles` | JWT + `identity:write` + idempotência | Criar perfil canônico único |
| `GET` | `/api/v1/identity/licenses` | JWT + tenant | Listar licenças visíveis por RLS |
| `POST` | `/api/v1/identity/licenses` | JWT + `identity:write` + idempotência | Registrar licença canônica |
| `GET` | `/api/v1/identity/accreditations` | JWT + tenant | Listar estado ativo, próximo do vencimento ou expirado |
| `POST` | `/api/v1/identity/accreditations` | JWT + `identity:write` + idempotência | Registrar credenciamento com validade parametrizada |
| `POST` | `/api/v1/identity/relationships` | Papel e scope específicos + idempotência | Criar vínculo ativo |
| `GET` | `/api/v1/ledger/verify` | JWT + tenant | Recalcular cadeia e validar Ed25519 |

Rotas de escrita de domínio exigem `Idempotency-Key` entre 16 e 128 caracteres. Login, refresh e logout não pertencem ao contrato de idempotência de domínio e são protegidos por rate limit.

## Exemplo

```bash
curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vortex.local","password":"sua-senha-local-forte"}'
```

Uma escrita autenticada deve enviar contexto e chave idempotente:

```bash
curl -s http://localhost:3000/api/v1/identity/accreditations \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "X-Company-Id: $COMPANY_ID" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H 'Content-Type: application/json' \
  -d '{
    "accreditationType":"PCA",
    "portariaNumber":"PORTARIA-001",
    "issueDate":"2026-09-05",
    "scope":["GRUPO_B_MEDIO_PORTE"]
  }'
```

## SDK

O pacote `@vortex/sdk` centraliza URL, token, tenant, empresa e idempotência. Ele adiciona os headers obrigatórios, gera chave para escrita quando necessário e interpreta o envelope global. Assim, os remotes não duplicam regras de transporte.

A API-first da Parte 1 está implementada em contratos TypeScript e SDK. A publicação externa versionada do SDK e a documentação OpenAPI expandida permanecem para a etapa de distribuição.

## Referências

[1]: canonical/prompts/parte-1.md "Contrato global e endpoints requeridos para a Parte 1"
[2]: canonical/04-enums-controlados.md "Enums controlados do VORTEX"
[3]: canonical/02-parametros-prazos.md "Parâmetros e prazos regulatórios"
