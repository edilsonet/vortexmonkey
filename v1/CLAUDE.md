# CLAUDE.md — CONTRATO GLOBAL DO PROJETO VORTEX

> MEMÓRIA PERSISTENTE DO AGENTE. Leia integralmente no início de cada sessão.

## 1. IDENTIDADE DO PROJETO
- Nome: VORTEX — Ecossistema de processos auditáveis e imutáveis para a aviação civil brasileira.
- Fase atual: Fase 8 — RLoja (Marketplace B2B), BRE (Motor de Regras Declarativo), Integrações e Consolidação Final.
- Fonte regulatória: documentos oficiais da ANAC (RBACs, ISs, Resoluções). Referências em `docs/*.md`.

## 2. STACK E ARQUITETURA (IMUTÁVEL)
- Backend: NestJS (TypeScript), monorepo Turborepo.
- Banco: PostgreSQL 16 com Row-Level Security (RLS). Nunca MongoDB.
- Cache/sessão: Redis. Fila: RabbitMQ. Arquivos: MinIO (presigned URLs).
- Arquitetura: um backend único (`api.vortex.com`) consumido por frontends separados por subdomínio.
- Multi-tenant: lógico (RLS por linha). Tenant é CONTEXTO, nunca dono do dado.
- MDM: o núcleo é o DONO DA VERDADE de Pessoas e Ativos. Apps (loja, recrutamento) são consumidores + contexto de negócio, sincronizados via event bus (espelho reativo).

## 3. AS 10 REGRAS IMUTÁVEIS (CONTRATO GLOBAL)
1. Toda escrita: valida permissão → executa ação → registra no ledger → gera protocolo (se aplicável) → publica evento no bus.
2. Ledger é IMUTÁVEL (append-only): nunca UPDATE/DELETE. Mudança = novo evento.
3. Tenant é contexto, não dono. Todo dado operacional tem `user_id`, `company_id`, `tenant_id`.
4. Permissão: RBAC + ABAC no middleware. Frontend NUNCA valida regra de negócio.
5. Padrão de resposta global: `{ success, data, error }`. Erros com `code` padronizado.
6. Rotas de escrita exigem `Idempotency-Key` (Redis, 24h).
7. Não use banco por cliente, não use schema por cliente, não crie serviço fora do monorepo.
8. Responda com código pronto para rodar, com migrations SQL e testes mínimos de aceite.
9. Secrets NUNCA em claro: use variáveis de ambiente / secret manager. Nunca commite `.env`.
10. Antes de cada entrega, liste o que fez e o que NÃO fez (nunca silencie lacunas).

## 4. PADRÃO DE RESPOSTA GLOBAL
```json
{ "success": true, "data": {}, "error": null }
{ "success": false, "error": { "code": "PERMISSION_DENIED", "message": "Sem acesso", "request_id": "..." } }
```
Códigos de erro: `AUTH_REQUIRED`(401), `TOKEN_EXPIRED`(401), `PERMISSION_DENIED`(403), `NOT_FOUND`(404), `VALIDATION_ERROR`(422), `RATE_LIMITED`(429), `IDEMPOTENCY_CONFLICT`(409), `LEDGER_VERIFICATION_FAILED`(500).

## 5. ESTRUTURA DO MONOREPO
```
/apps
  /api-gateway      # gateway, rate limit, idempotency
  /auth-service     # login, refresh, logout, users/me
  /ledger-service   # ledger imutável (vergalhão central)
  /protocol-service # protocolo AAAA-NNNNNN
  /document-service # upload, versões, assinatura
  /catalog-service  # catálogo base (vergalhão)
  /subscription-service # tenants, planos, billing
  /identity-service # users, companies, relationships, MDM de Pessoas, procurações, responsável legal
  /notification-service # e-mail + in-app + event bus consumer
/packages
  /types  /utils  /config  /database
/docs
  rbac-183.md  res-458.md  (e demais referências por fase)
```

## 6. SCHEMAS POSTGRESQL (por domínio)
`identity`, `ledger`, `protocol`, `documents`, `catalog`, `subscriptions`, `oauth`, `signatures`, `compliance`, `notifications`. Cada schema isolado; RLS ativa nas tabelas de tenant.

## 7. LEDGER (O VERGALHÃO CENTRAL)
- Tabela `ledger.ledger_blocks`: `id, version, previous_hash, hash, timestamp, entity_type, entity_id, action_type, payload jsonb, changes jsonb, created_by, signature, tenant_id`.
- Hash SHA-256 encadeado + assinatura Ed25519 (não-repúdio) + `created_by`.
- `changes` guarda diff de campos (`field_path`, `old_value`, `new_value`).
- Particionamento por mês. Nunca UPDATE/DELETE.
- Base: Resolução 458/2017 + IS 43.9-004 (ver `docs/res-458.md`).

## 8. MDM DE PESSOAS (VERGALHÃO DE IDENTIDADE)
- O núcleo guarda o perfil canônico da pessoa (quem é, licenças, credenciamento, experiência validada).
- Licenças (RBAC 61/63/65) e credenciamento (RBAC 183) são FONTE ÚNICA — nunca duplicadas nos apps.
- Apps (loja, recrutamento) consomem via event bus (espelho reativo) e criam apenas contexto de negócio.

## 9. SEGURANÇA (OBRIGATÓRIO)
- JWT obrigatório; RBAC + ABAC no middleware; RLS no PostgreSQL.
- Secrets via env/secret manager; nunca commitar `.env` (use GitGuardian).
- Rate limit (Redis): auth 10/min, leitura 300/min, escrita 60/min, upload 20/min.
- Queries parametrizadas; validação de inputs (422); restringir uploads (tipo/tamanho/hash).
- Security headers; forçar HTTPS; scan de dependências.

## 10. REFERÊNCIAS REGULATÓRIAS
- Consulte `docs/*.md` para os requisitos obrigatórios (IDs da matriz).
- Antes de fixar qualquer requisito em código, verifique a vigência no site da ANAC.

## 11. CONVENÇÃO TERMINOLÓGICA (STE-BR)
- Use vocabulário controlado da aviação PT-BR. Sem sinônimos desnecessários.
- Frases curtas; voz ativa; imperativo em instruções. Máx. 20 palavras (procedimentos) / 25 (descritivo).
- Termos regulatórios: use a grafia oficial (RBAC, IS, OM, CRS, MMA, DA, FCDA, EO, LC, MOM, MCQ, SGSO).

## 12. DEFINITION OF DONE (DoD) — POR PROMPT
- Código roda via docker-compose; migrations SQL aplicadas.
- Toda escrita gera ledger + protocolo (quando aplicável).
- RLS e permissões testadas (usuário sem vínculo = 403).
- Idempotency testada (retry não duplica).
- Testes mínimos de aceite passando; lacunas listadas (nunca silenciadas).

## 13. COMANDOS
- Subir tudo: `docker-compose up`
- Rodar migrations: `pnpm db:migrate`
- Rodar testes: `pnpm test`
- Verificar ledger: `pnpm ledger:verify`
- Health: `GET /health` → `{ success: true, data: { status: "ok" } }`
