# Análise de Reuso — Repositórios Externos aplicados ao VORTEX

> Documento gerado a partir da leitura direta dos 7 repositórios clonados em `repos-externos/`.
> Objetivo: dizer **o que reaproveitar**, **em qual app/schema do VORTEX**, **como adaptar** e **o que descartar** por conflitar com as regras imutáveis do contrato (`CLAUDE.md`).
> Data da análise: 2026-09-24. Alvo: VORTEX v4 (14 apps, Angular 19 + Nx, NestJS, PostgreSQL 16/RLS, TypeORM + SQL nativo, sem Prisma, sem MongoDB, sem CQRS, ledger append-only).

---

## 1. Sumário executivo

- **Nenhum** repositório é reutilizável por cópia direta de stack: todos usam React/Next (VORTEX usa Angular), 4 usam Prisma ou acesso direto a banco, 2 usam MongoDB, e nenhum tem RLS multi-tenant + ledger imutável como o VORTEX.
- O valor está em **lógica de domínio**, **modelagem de dados** e **padrões de arquitetura**, não em código de framework.
- Dois repositórios concentram o maior valor:
  1. **MyTailLog** (MIT) — motor de vencimento/urgência, reconciliação de medidores (hobbs/tach), projeção de utilização, W&B, auditoria de lacunas, RLS "choke-point", feed append-only e OIDC. Mapeia quase 1:1 para `mro`, `ops`, `compliance`, `ledger`, `oauth`, `documents`.
  2. **nextjs-fastify-saas-rbac** (didático) — RBAC/ABAC com CASL (abilities, roles, subjects, conditions), modelo organizações/membros/convites/tokens, guard de membership. Traduzível para Guards/interceptors NestJS + RLS.
- Relevantes como **referência conceitual** de MRO/operações: **SlingologyMX** (Apache-2.0), **ultimate-backend** (MIT), **next-saas-rbac**.
- Pouco ou nada a reaproveitar: **Aircraft-Maintenance-Inventory-System** (SQL MySQL didático, sem licença) e **aviation-management-system** (Django/React, contexto militar, **licença proprietária/sem LICENSE**).
- O código real do VORTEX **não está no repo clonado** (que é especificação v4 + `ANAC/` + o rascunho v1 em `v1/` e `v1-rascunho-superado/`). A aplicação dos padrões abaixo se dará quando o código das fases for materializado (no rascunho v1 / nas 14 partes do `prompts-v4/`).

### Ranking de valor

| # | Repositório | Licença | Veredito | Melhor uso no VORTEX |
|---|-------------|---------|----------|----------------------|
| 1 | MyTailLog | MIT | **Médio-Alto** | Lógica de manutenção/preditiva + padrões SQL de ledger/RLS/OIDC |
| 2 | nextjs-fastify-saas-rbac | didático (MIT declarado em subpacote) | **Médio** | Modelo RBAC/ABAC + organizações/convites |
| 3 | SlingologyMX | Apache-2.0 | **Médio** | Regras de counters/compliance/amortização + schema |
| 4 | ultimate-backend | MIT | **Médio** | Conceitos: tenant resolution, RBAC domain, convites, fila de e-mail, billing |
| 5 | next-saas-rbac | uso educacional | **Médio** | Conceitos de RBAC (mesmo case do #2) |
| 6 | aviation-management-system | proprietária / sem LICENSE | **Baixo** | Fluxo BFS/despacho, defeitos diferidos, forecast (conceito) |
| 7 | Aircraft-Maintenance-Inventory-System | sem LICENSE | **Baixo** | Modelagem MRO/estoque (conceito) |

> Item 8 da lista original — `https://github.com/topics/rbac` — **não é um repositório** (é a página de tópico `rbac` do GitHub), portanto não pode ser clonado. Sugestões de estudo equivalentes na seção 10.

---

## 2. Regras de ouro da integração

Antes de portar qualquer coisa, filtrar por estas invariantes do VORTEX:

1. **Frontend é Angular 19** (standalone/signals/`inject()`/`@if`/`@for`) sobre Angular Material. Toda UI React/Next/Vite é descartada; aproveita-se apenas o **comportamento/tela como referência**.
2. **Backend é NestJS** (rest, envelope `{ success, data, error }`, guards/interceptors, `Idempotency-Key`). Fastify cru, GraphQL, Django e Server Actions não entram.
3. **Persistência: PostgreSQL 16 + TypeORM + SQL nativo. SEM Prisma, SEM MongoDB, SEM CQRS, SEM EventStore.**
4. **Multi-tenant por RLS por linha** (`tenant_id`/`company_id`/`user_id`), nunca banco/schema por cliente e nunca isolamento apenas aplicacional.
5. **Ledger append-only** (SHA-256 encadeado + Ed25519, payload AES-256-GCM). Nada de `UPDATE` de histórico; correções são novos eventos.
6. **Domínio é ANAC / PT-BR / BRL**, não FAA / en-US / USD. Nomenclatura: OS, APRS/CRS, FORM 8130-3, MEL/DA, CIV/CMA, TBO, TSN/CSN, SGSO, PPSP.
7. **Validação regulatória é soberana no backend** — nenhum app pode confiar em validação de tela.
8. **Segredos só em env**; nada de `.env` real commitado (ver seção 9 sobre `.gitignore`).

---

## 3. Análise por repositório

### 3.1 MyTailLog (iiamit/MyTailLog) — MIT — veredito Médio-Alto

**Stack:** monorepo npm; `apps/web` = Next.js 16 + React 19 + Tailwind 4; `apps/mobile` = Capacitor + Vite + SQLite (offline-first); backend **Supabase self-managed** (PostgreSQL 16 + RLS + GoTrue + Storage + Edge/cron) com 60 migrações SQL nativas; IA de visão (Anthropic/OpenAI). 69 testes unit + 37 specs e2e. Produto real (App Store).

**Domínio:** `aircraft`, `logbook`, `page`, `log_entry`, `component`, `document`, `hours_reading`, `meter_reset`, `maintenance_item`, `ad_compliance`, `equipment`, `weight_balance`, `oil_addition`, `oil_analysis_sample`, `squawk`, `adsb_flight`, `change_log`, `aircraft_share`, `oauth_client/account_grant/aircraft_grant`, `backup_run`.

**Arquivos-chave:** `apps/web/src/lib/{status,maintenance,compliance,audit,hobbsTach,aircraftHours,utilization,reminders,weightBalance,duplicates,crypto}.ts`, `apps/web/src/lib/{extraction,oauth,sync,faa,csv}/*`, `supabase/migrations/0044_change_log.sql`, `apps/web/e2e/rls-isolation.spec.ts`.

| Reuso | Arquivo-fonte | Destino VORTEX (app/schema) | Como aplicar |
|-------|---------------|-----------------------------|--------------|
| Vencimento (calendário/meses/horas) + urgência (`overdue`/`due_soon`) | `lib/status.ts`, `lib/maintenance.ts`, `lib/compliance.ts` | `mro`, `ops`, `compliance`, Hub Preditivo | Portar funções puras TS (MEL, DA, 100h, TBO, inspeções) |
| Reconciliação Hobbs↔Tach, ratio com confiança, anomalias, resets | `lib/hobbsTach.ts`, `lib/aircraftHours.ts` | `ops` (frota/horas), `mro` | Módulo de horas de célula/motor |
| Projeção de data por taxa de utilização | `lib/utilization.ts` | Hub Preditivo (parte-4) | Badges INFO/WARNING |
| Alertas por lead-time configurável | `lib/reminders.ts` | `notification-service` | Modelo de alertas por categoria |
| AES-256-GCM com prefixo de versão | `lib/crypto.ts` | `ledger-service`, `documents` | Base do payload cifrado do ledger |
| Feed append-only com `seq` + trigger `to_jsonb` + tombstone | `0044_change_log.sql`, `lib/sync/*` | `ledger-service` | Cursor idempotente e colapso por (tabela,id) |
| RLS "choke-point" (`has_aircraft_access`/`can_edit_aircraft`) + teste de isolamento | `0001_schema_v1.sql`, `e2e/rls-isolation.spec.ts` | **todos os schemas** | Padrão de policy + teste executável |
| W&B (moment = weight×arm, flag obsoleto) | `lib/weightBalance.ts` | `ops` (repeso 36m), `charter` | Direto |
| Auditoria de lacunas de registros | `lib/audit.ts` | `compliance`, `ledger` | Adaptar categorias para RBAC/ANAC |
| OIDC (PKCE, DCR, adapter SQL, scopes) | `lib/oauth/*`, migrações 0033–0051 | `auth-service`, schema `oauth` | Base para DCR/scopes do VORTEX |
| Extração IA com confiança por campo + threshold | `lib/extraction/*` | `documents`, `certifications` | Mapear para níveis N0–N3 |
| Dedup de páginas/entradas | `lib/duplicates.ts` | `catalog`, `documents` | Heurísticas reutilizáveis |

**Conflitos:** Supabase/GoTrue/Edge (reescrever auth/policies para NestJS + `tenant_id`), Next/React (UI descartada), IA externa (atenção à política de não expor dados), domínio FAA vs ANAC, escopo single-owner vs multi-tenant empresarial, ausência de NestJS/TypeORM/RabbitMQ/MinIO.

### 3.2 SlingologyMX (AlchemyGeek/SlingologyMX) — Apache-2.0 — veredito Médio

**Stack:** React 18 + Vite + Tailwind/shadcn + TanStack Query; backend **Supabase/Lovable Cloud** (Postgres + GoTrue + Deno Edge). Sem testes, sem CI; 1 commit squash.

**Domínio:** `aircraft counters` (+histórico), `maintenance_logs`, `directives` + `aircraft_directive_status` + `maintenance_directive_compliance`, `equipment`/`community_service_bulletins`, `notifications`, `subscriptions`/`transactions`/`reserves`, `aircraft_api_keys`. RLS por `auth.uid() = user_id`.

**Arquivos-chave:** `src/lib/{counterInterpolation,counterValidation,amortization,timelineProjection,maintenanceStatus,timelineEvents,schemaMigrations}.ts`, `src/components/ActiveNotificationsPanel.tsx`, `supabase/functions/integration-{ingest,counters}/index.ts`, `supabase/migrations/*`.

| Reuso | Arquivo-fonte | Destino VORTEX | Como aplicar |
|-------|---------------|----------------|--------------|
| Interpolação/extrapolação de counters | `counterInterpolation.ts` | `ops`, `mro` | TS estrito; base hobbs/tach + projeção |
| Validação monotônica cronológica | `counterValidation.ts` | `ops`, `mro` | Service NestJS + constraint SQL |
| Rateio por horas de voo / tempo | `amortization.ts` | ERP Manutenção/Oficina, `accounting` | Custo por hora e rateio de OS |
| Projeção "quem vence primeiro" (data × horas) | `timelineProjection.ts` | Hub Preditivo, `ops`, `mro` | MEL/AD/SB |
| Modelo diretriz + compliance + histórico | migrações | `mro`, `certifications` | Adaptar AD/SB para ANAC (sem FAA) |
| Motor de notificações Date/Counter + respawn | `ActiveNotificationsPanel.tsx` | `notifications` | Regras no backend |
| Equipamento com serial/garantia | migrações | `stock`, `catalog` | Ficha de componente/custódia |
| Transação vinculada (`reference_type/id`) | migrações | `accounting` | `source_module` + `source_entity_id` (já previsto na seção 6 do contrato) |
| API key com hash + dedupe `external_id` | `integration-ingest/index.ts` | `api-gateway` | Trocar por `Idempotency-Key` no Redis |

**Conflitos:** React/Vite vs Angular; Supabase vs NestJS; acesso direto do browser ao banco (viola regra 4); RLS por `user_id` (falta `company_id`/`tenant_id`); sem ledger/protocolo/MinIO/WebSocket; FAA/EASA + en-US + USD.

### 3.3 Aircraft-Maintenance-Inventory-System (Mehtapgultepe) — sem licença — veredito Baixo

**Stack:** SQL puro / **MySQL 8.0** (`aircraft_maintenance_SQL/aircraft_db.sql`, 307 linhas: DDL+DML+triggers+procedure+queries). Trabalho acadêmico, sem LICENSE → usar só como inspiração conceitual.

**Schema (8 tabelas):** `AIRCRAFT`, `EMPLOYEES`(licenças), `SUPPLIERS`, `PARTS`(shelf life, preço), `STOCK_LOCATIONS`(bin), `PART_INVENTORY`(saldo + min stock, `CHECK ≥ 0`), `MAINTENANCE_ORDERS`(status), `INVENTORY_MOVEMENT`(auditoria de movimento).

**Automação:** `trg_BeforeInventoryMovement` (bloqueia estoque negativo via `SIGNAL SQLSTATE`), `trg_AfterInventoryMovement` (`UPDATE` de saldo), `sp_CompleteMaintenance(order)`; queries de licença vencendo <60d, low-stock/AOG com contato do fornecedor, custo por frota, rastreabilidade movimento→OS→aeronave→técnico.

| Elemento | Destino VORTEX | Adaptação MySQL→PG16 |
|----------|----------------|----------------------|
| AIRCRAFT / horas | `mro`, `ops` | `identity`/`bigint`/`timestamptz` + `tenant_id/company_id` + RLS |
| EMPLOYEES / licença | `identity` + `professional` (CIV/CMA) | Separar pessoa↔licença; enums reais (RBAC 65) |
| SUPPLIERS | `mro` Compras | FK para empresas do Núcleo |
| PARTS + shelf life | `catalog` + `stock` | Catálogo único central |
| PART_INVENTORY / min stock | `stock-service` | RLS + custódia dinâmica |
| MAINTENANCE_ORDERS / status | `mro` OS 12 etapas | `Status`→máquina de estados + ledger por transição |
| INVENTORY_MOVEMENT | `stock` + `ledger` | Append-only real, hash encadeado |
| triggers anti-negativo | `stock` | PL/pgSQL `RAISE EXCEPTION`; ou serviço de domínio |
| queries analíticas | `mro` Relatórios / Hub Preditivo | `CURRENT_DATE`; alertas INFO/WARNING |

**Conflitos:** dialeto MySQL (`DELIMITER`, `SIGNAL`, `DATEDIFF`, `CURDATE`), sem multi-tenant/RLS, `UPDATE` mutável (não append-only), domínio genérico não-ANAC (B1/B2 EASA), IDs manuais, sem protocolo/idempotência, sem índice em FKs, sem licença.

### 3.4 aviation-management-system (amank05443) — proprietária / sem LICENSE — veredito Baixo

**Stack:** Django 4.2 + DRF + SimpleJWT (SQLite default), front React 18 (CRA) + MUI + Chart.js. Contexto **militar** (login por PNO, ranks, seção de armamento). Sem testes. README declara proprietário → **barreira legal de reuso**.

**Modelos:** `User`(pno/rank), `Aircraft`(horas, fuel, tire, next maintenance), `LeadingParticulars`(1:1), `FlyingOperation`, `MaintenanceSchedule`(job cards), `DeferredDefect`, `Limitation`, `MaintenanceForecast`, cadeia `BeforeFlyingService`→`PilotAcceptance`→`PostFlying` com assinatura em cadeia (FSI→tradesman→supervisor).

| Reuso (conceito) | Arquivo-fonte | Destino VORTEX | Como portar |
|------------------|---------------|----------------|-------------|
| Cadeia BFS multi-assinatura + máquina de estados | `backend/aviation_app/views.py:214-375` | `ops` (liberação de voo/despacho) | Service NestJS com steps tipados + ledger por passo |
| DeferredDefect (severidade/status/deferral) | `models.py:195-232` | `mro` — MEL/DA/FCDA | TypeORM + RLS + condições de despacho |
| Limitation ativa/lifted | `models.py:235-254` | `mro` — limitações/DA | Tabela + lifting append-only |
| MaintenanceForecast mensal | `models.py:257-275` | `mro`/`ops` | Cálculo por intervalos RBAC 43/145 + job |
| LeadingParticulars (horas/pesos) | `models.py:93-111` | `mro`/`identity` | Ficha de aeronave referenciando `catalog` |
| Job-card templates por intervalo | `frontend/.../ScheduleMaintenance.js:11-90` | `mro` Biblioteca Técnica/OS | Converter JSON hardcoded em `mro.task_template` |
| Dashboard agregador | `views.py:70-118` | Dashboards dos ERPs | Endpoint NestJS com SQL nativo |
| Propagação de totais pós-voo | `views.py:459-469` | `ops` diário técnico | Transação + evento no bus (nunca `UPDATE` cru) |

**Conflitos:** Django→NestJS (reescrita total), React CRA→Angular, SQLite/`DEBUG=True`/`fields='__all__'`, sem RLS/tenant/ledger/assinatura, contexto militar (armamento, "100 Hourly", ranks) vs ANAC civil, PIN em claro, permissões só `IsAuthenticated`, **licença proprietária**.

### 3.5 ultimate-backend (juicycleff) — MIT — veredito Médio

**Stack:** NestJS + GraphQL (Apollo/gateway) + gRPC (`.proto`), MongoDB (ORM próprio `repo-orm`), **CQRS/Event Sourcing** (`@nestjs/cqrs` + EventStoreDB), **Casbin** (`nestjs-casbin` + adapter Mongo), Bull/Redis (e-mail), SendGrid, Stripe, Consul/etcd (service discovery), JWT/passport.

**Apps:** `api-admin`, `service-account`, `service-access`, `service-role`, `service-tenant`, `service-billing`, `service-notification`, `service-project`, `service-webhook`. **Libs:** `common`, `contracts`, `core`, `proto-schema`, `repo-orm`, `repository`.

| Padrão (conceito) | Arquivo-fonte | Destino VORTEX | O que copiar / evitar |
|-------------------|---------------|----------------|-----------------------|
| Resolução de tenant plugável (Domain/Header/Query) + `req.tenantInfo` | `libs/core/src/mutiltenancy/build-tenant-info.helper.ts` | `api-gateway`, `packages/utils` | Copiar estratégia + headers `x-tenant-id`; **evitar** banco por tenant |
| RBAC com domínio `tenant::user` + grouping `g()` | `service-role/src/rbac_model.conf`, `roles.service.ts` | `auth-service`, `packages/database` | Modelo `sub,obj,act,dom`; trocar adapter por Postgres/SQL + RLS |
| Decorators `@Resource`/`@Permission` + seed de policies | `libs/core/src/decorators/*` | `packages/types` + guards | Registro declarativo recurso→ação→role |
| Guard de autorização + API token | `libs/core/src/guards/gql-auth.guard.ts` | guards REST dos apps | Reescrever para HTTP/NestJS |
| Convite/vínculo PENDING/ACCEPTED/REJECTED + token | `service-tenant/.../member/{invite,accept}*` | Núcleo/Rconta (vínculo dupla confirmação) | Copiar máquina de estados |
| E-mail transacional em fila (retries, templates) | `service-notification/src/email/queue/auth.process.ts` | `notification-service` | Fila→template→envio; trocar Bull/SendGrid por RabbitMQ/Resend |
| Billing: plano/assinatura/fatura/status | `service-billing/.../subscription/*` | `subscription-service` | Modelo de domínio; trocar Stripe por Asaas |
| Contexto entre serviços (user+tenant) | `libs/core/src/helpers/set-grpc-context.helpers.ts` | `packages/utils` | Payload de contexto assinado (via REST/RabbitMQ) |
| Erros tipados | `libs/common/src/errors/rpc.error.ts` | núcleo de resposta | Normalizar para `{ success, data, error }` |
| Segregação de libs (common/contracts/core) | `libs/*` | `packages/*` (Nx) | Copiar fronteiras de responsabilidade |

**Conflitos (bloqueantes de código):** CQRS/ES (proibido no VORTEX), MongoDB/ArangoDB/EventStore/ORM próprio (proibido), `TenantDatabaseStrategy` (conflita com RLS único), Consul/etcd (fora da stack), GraphQL-first vs REST, Stripe vs Asaas, SendGrid vs Resend, Bull vs RabbitMQ, Casbin+adapter Mongo (só modelo conceitual).

### 3.6 nextjs-fastify-saas-rbac (rcrdk) — didático — veredito Médio

**Stack:** Turborepo + pnpm; `apps/api` = **Fastify 5 + Zod + Prisma 6 + PostgreSQL 16** + JWT RS256 + Nodemailer + Cloudflare R2 + Swagger; `apps/web` = Next.js 15 + React 19 + Tailwind/shadcn; `packages/auth` = **CASL 6**; `packages/env` (`@t3-oss/env-nextjs`+Zod). **Sem RLS** (isolamento aplicacional via `getCurrentUserMembership`), sem Redis/refresh/2FA/rate-limit/idempotência.

| Padrão | Arquivo-fonte | Destino VORTEX | Como adaptar |
|--------|---------------|----------------|--------------|
| ABAC/CASL: subjects como tupla `[action, subject]`, `conditions` (`ownerId:{$eq}`), `detectSubjectType` por `__typename` | `packages/auth/src/{index,permissions,roles}.ts`, `subjects/*` | `libs/core` (authz) + auth-service + ERPs | Manter `@casl/ability` como lib pura; conditions `ownerId`→`company_id`/`tenant_id`; integrar via `CanActivate` + `AbilityFactory` |
| Roles ADMIN/MEMBER/BILLING + matriz de permissões | `packages/auth/src/roles.ts` | auth-service, Rconta | Ampliar para papéis ANAC (ARSO, SGSO, DOB, instrutor) por app |
| Membership como guard de tenant | `apps/api/src/http/middlewares/auth.ts`, `utils/get-user-permissions.ts` | `CompanyContextGuard` + `SET app.company_id` (RLS) | Guard NestJS resolve `:slug`→company, injeta tenant e alimenta RLS |
| Convites (criar/expirar/aceitar/duplicidade, autojoin por domínio) | `routes/invites/*` | `identity` (Convites) | Adicionar dupla confirmação + bloco no ledger |
| Vínculo pessoa↔organização (`Member` único por `[org,user]`) | `prisma/schema.prisma` | `identity` (Vínculos) | Modelar com dupla aprovação |
| Token por tipo (PASSWORD_RECOVER/EMAIL_VALIDATION, TTL 5min) | `schema.prisma` (`Token`) | auth-service + Redis | Trocar tabela por chaves Redis TTL |
| Verificação de domínio por DNS TXT | `routes/organization/authorize-domain.ts` | `compliance`/`identity` (N2) | Reusar como validação N2 (fonte oficial) |
| Billing por uso (assentos/projetos) | `routes/billing/get-organization-billing.ts` | `subscription-service` | Trocar por faturas/comissão Asaas |
| Transferência de propriedade transacional | `routes/.../transfer-organization.ts` | `identity` (empresa.owner_id) | `QueryRunner`/transação + bloco no ledger |
| Env validado por Zod | `packages/env/index.ts` | `packages/config` | Usar `@t3-oss/env-core`; nunca commitar `.env` |
| Error handler padronizado | `http/error-handler.ts` | api-gateway/ExceptionFilter | Envelope + códigos do contrato |
| Upload R2 | `lib/cloudflare-r2.ts` | `document-service` | Trocar por MinIO + presigned |

**Conflitos:** Prisma→TypeORM+SQL, Fastify→NestJS, Next→Angular, sem RLS, sem ledger/envelope/`Idempotency-Key`, Nodemailer→Resend.

### 3.7 next-saas-rbac (carlos-hfc) — uso educacional — veredito Médio

**Stack:** Turborepo + pnpm; Fastify 4 + Zod + **Prisma 5** + Postgres; Next.js 15 + React 19; `@saas/auth` (CASL 6) + `@saas/env`. **Sem LICENSE**, `private: true` em todos os pacotes. É o **mesmo case Rocketseat** do #3.6, porém menos completo. Papéis: Owner(=ADMIN+`ownerId`), Administrator, Member, Billing, Anonymous.

| Padrão | Arquivo-fonte | Destino VORTEX | Como adaptar |
|--------|---------------|----------------|--------------|
| Ability builder CASL + conditions | `packages/auth/src/permissions.ts`, `src/index.ts` | `@casl/ability` + `CaslAbilityFactory` | Conditions por `company_id`/`tenant_id` |
| Subjects tipados (tuplas Zod) | `packages/auth/src/subjects/*` | `@CheckPolicies` por domínio ANAC | Converter para Action/Subject dos domínios |
| `getUserPermissions({id, role})` | `apps/api/src/utils/get-user-permissions.ts` | `CaslAbilityFactory.createForUser(membership)` | Injetável em Guards |
| Middleware membership (org por slug, 401 se não-membro) | `apps/api/src/http/middlewares/auth.ts` | `TenantGuard` + Redis + `SET LOCAL app.tenant_id` | Repositório TypeORM no lugar de Prisma |
| Convites (criar/accept/revoke/reject) | `apps/api/src/routes/invites/*` | `identity.invites` | Dupla confirmação + ledger |
| Transferência de propriedade transacional | `apps/api/src/routes/orgs/transfer-organization.ts` | `identity` + ledger | Transação + bloco imutável |
| Billing por uso (seats/projects) | `apps/api/src/routes/billing/get-organization-billing.ts` | `subscription-service` | Trocar por Asaas |
| Ability no cliente (esconder UI) | `apps/web/src/auth/auth.ts` | Angular (guards/hides) | Nunca validar soberanamente |

**Conflitos:** idênticos ao #3.6 (Prisma, Fastify, Next, sem RLS/ledger/envelope/Asaas). Aproveitamento de código ~0%; conceitual alto.

---

## 4. Mapa consolidado — o que entra em cada parte do VORTEX

| App / Schema VORTEX | Contribuições dos repos externos |
|---------------------|----------------------------------|
| **Núcleo** (`identity`, `catalog`, `stock`, `documents`) | Modelo organize/members/invites e vínculo com dupla confirmação (3.6/3.7/3.5); catálogo+estoque MRO (3.3); equipamento com serial/garantia (3.2); dedup (3.1) |
| **Parte 01 — Fundação** (auth/RBAC/RLS) | `@casl/ability` + AbilityFactory e subjects tipados (3.6/3.7); tenant resolution (3.5); RLS choke-point + teste de isolamento (3.1); env validado (3.6) |
| **Parte 02 — Ledger** | Feed append-only com `seq`+tombstone+cursor (3.1); AES-256-GCM versionado (3.1); idéia de concessões (3.1) |
| **Parte 03 — Documentos/Assinatura** | Extração IA com confiança N0–N3 (3.1); upload presigned (3.1 MinIO / 3.6 R2); versionamento de schema/backup (3.2) |
| **Parte 04 — Billing/Hub Preditivo** | Modelo plano/assinatura/fatura (3.5); billing por uso (3.6/3.7); projeção de vencimento + urgência e alertas por lead-time (3.1/3.2) |
| **Parte 05 — ERP Manutenção (43/145)** | Vencimento/urgência, TBO, MEL/DA (3.1); counters/amortização/projeção (3.2); OS/estoque técnico/movimento e anti-negativo (3.3); defeitos diferidos/forecast/job cards (3.4) |
| **Parte 06 — ERP Operadores (91/121/135)** | Leading particulars, horas célula/motor, propagação pós-voo (3.4); reconciliação hobbs/tach + utilização (3.1/3.2); cadeia de liberação/despacho multi-assinatura (3.4 como conceito) |
| **Parte 07 — Cursos (141/142)** | Menor contribuição; ciclo de certificados/validade reaproveita motor de vencimento (3.1/3.2) |
| **Parte 08 — ERPs/RLoja/Comunicação** | Notificação em fila + templates (3.5); motor de notificações recorrentes (3.2); dedupe/idempotência de ingestão (3.2) |
| **Parte 14 — Publicações** | Metadados de documento + versionamento (3.2) |
| **Todos** | Padrão de error handler/`{success,data,error}` (3.5/3.6); segregação de libs/common/contracts/core (3.5) |

---

## 5. Roadmap sugerido de incorporação

1. **Fundação (Parte 01):** criar `libs/core`/`packages/auth` com `@casl/ability` + `AbilityFactory` + `TenantGuard` (base 3.6/3.7), policies RLS "choke-point" e teste de isolamento (base 3.1).
2. **Ledger (Parte 02):** portar AES-256-GCM versionado e o padrão de feed append-only com cursor/tombstone (3.1), adaptando ao modelo SHA-256+Ed25519+AES-256-GCM do contrato.
3. **Manutenção (Parte 05):** portar `lib/` de vencimento/urgência/counters/amortização/utilização/W&B (3.1 + 3.2) para serviços NestJS; modelar `mro` OS 12 etapas + estoque técnico com trigger anti-negativo em PL/pgSQL (3.3).
4. **Operadores (Parte 06):** portar horas de célula/motor e cadeia de liberação/despacho, registrando cada passo no ledger (3.4 conceito).
5. **Billing/Preditivo (Parte 04):** modelo plano/assinatura/fatura (3.5) + motor de projeção/alertas (3.1/3.2) alimentando badges INFO/WARNING.

> Sempre: primeiro **escrever o teste de isolamento RLS** e o **bloco de ledger** da feature; só depois portar a lógica.

---

## 6. Riscos e conflitos legais

- **Sem LICENSE (3.3, 3.4, 3.6, 3.7):** sem base jurídica explícita de redistribuição. Tratar como **referência conceitual**; não copiar código verbatim. `3.4` declara-se proprietário e usa bibliotecas (MUI/Chart.js) com licenças próprias.
- **MIT (3.1, 3.5):** reuso permitido com preservação de aviso de copyright. **Apache-2.0 (3.2):** reuso permitido com atribuição e aviso de mudanças.
- **Dados/IA (3.1):** extração por LLM externo (Anthropic/OpenAI) exige cautela com a política de não expor dados de tenant/LLM do ambiente.
- **Marcas/termos (3.3, 3.4):** nomenclatura FAA/EASA/militar deve ser **traduzida** para ANAC; não misturar no mesmo domínio.

---

## 7. Item não clonável e alternativas

`https://github.com/topics/rbac` é uma **página de tópico** (listagem), não um repositório Git. Para estudo de RBAC/ABAC alinhado ao VORTEX, considerar (avaliar licença antes de reusar):

1. `stalniy/casl` — a própria biblioteca CASL (MIT) já usada como referência em 3.6/3.7.
2. `nestjsx/nest-access-control` — guardas de autorização para NestJS.
3. `casbin/casbin` + `node-casbin` — modelo `sub,obj,act,dom` (referência do 3.5), sem adapter Mongo.
4. `Permify` / `ory/keto` / `openfga` — motores de autorização relacionais (Zanzibar-like), se o escalonamento exigir.
5. `nestjs/nest` (samples de `Authorization`) e docs oficiais CASL + NestJS.

---

## 8. Nota sobre versionamento

Os repositórios de terceiros foram clonados em `repos-externos/` **dentro** do repositório VORTEX. Para não versionar código de terceiros (e evitar submódulos/arquivos acidentais), a pasta `repos-externos/` é mantida fora do Git via `.gitignore` na raiz.

---

## 9. Aplicação efetiva (status)

Primeira incorporação concreta: as lógicas puras de 3.1 e 3.2 foram **portadas** (não copiadas verbatim) para o monorepo `v1/` como biblioteca de domínio.

### 9.1 Biblioteca criada

`v1/packages/domain-aeronautics` (`@vortex/domain-aeronautics`) — TypeScript estrito, sem dependências de framework, banco ou HTTP. Recebe dados já carregados e calcula.

| Módulo | Origem | O que foi portado | O que foi adaptado |
|--------|--------|-------------------|--------------------|
| `dueness.ts` | 3.1 MyTailLog (`compliance.ts`) | Vencimento por data/horas/ciclos, meses-calendário no último dia do mês, janela de 30 dias, reset cruzado, urgência (overdue/due_soon/upcoming/none), `dueSoonDaysForKind` | Tipos `ComplianceItem`/`NextDue`; limiares viraram objeto `UrgencyThresholds`; textos em pt-BR |
| `utilization.ts` | 3.1 MyTailLog (`utilization`) | Taxa h/dia em janela móvel de 365 dias, descarte de intervalo que cruza reset, escala de confiança, projeção de data | Nomes e textos em pt-BR; `estimated` (ADSB/ratio) nunca entra na taxa |
| `counter.ts` | 3.2 SlingologyMX (`counterInterpolation` + `counterValidation`) | Normalização (colapsa mesma data no maior), interpolação, extrapolação com lookback, taxa de uso, horas de propriedade, validação monotônica/retroativa | Removido Supabase; tipos `CounterEntry`/`RawCounterRow`; mensagens em pt-BR |
| `weightBalance.ts` | 3.1 MyTailLog (`weightBalance.ts`) | Identidade momento = peso × braço, carga útil, alterações "stale" | `assessWB` agrega status/missing/stale |
| `amortization.ts` | 3.2 SlingologyMX (`amortization.ts`) | Rateio por tempo e por uso, sobreposição de período, confiança baixa em extrapolação | Removido Supabase; unidades dia/hora |
| `alerts.ts` | Ponte nova | Traduz urgência do motor em severidade do Hub, alinhada a `SYSTEM_ALERTS` de `@vortex/contracts-be` | Item regulatório vencido escala para BLOCKING |

### 9.2 Verificação

- `tsc -p tsconfig.json --noEmit` limpo (TS 5.9.2, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`).
- `vitest run`: **49 testes, 6 arquivos, todos verdes**.
- `pnpm-lock.yaml` atualizado com o novo pacote (via `pnpm install --no-frozen-lockfile`).

### 9.3 O que NÃO foi feito (lacunas explícitas)

1. A biblioteca ainda **não é consumida** por nenhum serviço NestJS. `apps/api` não a importa.
2. Não há tabelas de medição (`hobbs`/`tach`) nem de itens de conformidade com intervalo no schema. Hoje existem apenas `ops.aircraft.total_hours/total_cycles`, `ops.aircraft_logbooks.entries` (JSONB) e `ops.airworthiness_directives.compliance_deadline`. Integrar exige nova migração (`ops.aircraft_meter_readings`, `ops.compliance_items`).
3. Sem endpoint, DTO, bloco de ledger, chave de idempotência ou política RLS para a nova capacidade (regras 1, 6 e 7 do contrato ainda não exercidas aqui).
4. Rateio por uso e projeção não foram ligados ao financeiro/contábil do ERP Manutenção.
5. Nada foi portado de 3.3/3.4/3.5/3.6/3.7; apenas 3.1 e 3.2.
6. O pacote foi validado isoladamente; a checagem repo-inteira (`turbo run typecheck/test`) não foi executada porque o shim do `pnpm` no ambiente está corrompido (corepack procura `pnpm.cjs`, o cache só tem `pnpm.mjs`). Workaround usado: `node /root/.cache/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs`.

### 9.4 Próximo passo proposto

Escolher o alvo da integração antes de codar:

1. **v1 (NestJS):** criar migração das tabelas de medição/conformidade + módulo NestJS que lê dados, chama a biblioteca e emite alertas no Hub com bloco de ledger e idempotência.
2. **v4 (Angular+Nx):** mover a biblioteca para `libs/` do workspace Nx e só então ligar aos apps.

---

## 10. Integração no workspace Nx v4 (alvo canônico)

A seção 9 registrou o port para `v1/`. A decisão seguinte foi que **`v1/` não é o alvo**: é a árvore superseded (React 19 + Vite + Turborepo). O alvo passou a ser o workspace **Nx + Angular 19+ + NestJS** na raiz `/workspace`.

### 10.1 O que foi criado

| Projeto | Tipo | Conteúdo |
|---------|------|----------|
| `libs/shared-dto` (`@vortex/shared-dto`) | lib `type:contracts` | Envelope global (`ApiResponse<T>`, `ApiSuccess`, `ApiFailure`, `ApiErrorBody`, `ERROR_CODES`, `ok`, `fail`, `httpStatusFor`) e os contratos de domínio aeronáutico (`aeronautics.ts`) + contratos HTTP do MRO (`mro-api.ts`) |
| `libs/util-aeronautics` (`@vortex/util-aeronautics`) | lib `type:util` | O motor puro da seção 9 (6 módulos + 6 arquivos de teste). As **formas** ficaram em `shared-dto`; aqui ficou o **comportamento** |
| `apps/ops-mro` | app NestJS | `MroModule` consome o motor; rotas `POST /api/mro/*` e `GET /api/health`; filtro global `ApiExceptionFilter` garante o envelope também nas falhas |

Separação adotada: `shared-dto` = tipos/contratos (consumível por Angular sem puxar o motor); `util-aeronautics` = funções puras. Fronteira coerente com `type:contracts` × `type:util`.

### 10.2 Rotas de cálculo expostas (`ops-mro`)

- `GET /api/health`
- `POST /api/mro/compliance/assess` — vencimento recalculado → reset cruzado → urgência → alerta → projeção
- `POST /api/mro/utilization`
- `POST /api/mro/weight-balance/assess`
- `POST /api/mro/counters/value`
- `POST /api/mro/counters/validate`
- `POST /api/mro/amortization`

São rotas de **cálculo puro**: não mutam estado, por isso respondem 200 (não 201) e não exigem `Idempotency-Key`. Ledger/protocolo entram quando houver persistência.

### 10.3 Verificação executada

- `nx run-many -t typecheck test build lint`: verde nos 4 projetos (`@vortex/shared-dto`, `@vortex/util-aeronautics`, `ops-mro`, `ops-mro-e2e`).
- `@vortex/util-aeronautics:test`: **6 arquivos, 49 testes, todos verdes** (mesma contagem do port original).
- `ops-mro:build`: bundle webpack 55.1 KiB; Nx ordenou `^build` antes (o grafo detecta a dependência das libs).
- Servidor real (`node dist/apps/ops-mro/main.js`) exercitado por `curl`, com o envelope em todas as respostas:
  1. `GET /api/health` → `{success:true,data:{status:"ok",service:"ops-mro"},error:null}`.
  2. Leitura `tach` marcada `estimated:true` foi **excluída** da taxa (janela terminou em 2026-07-15, não em 07-16).
  3. Item de horas com reset cruzado: revisão geral em `1050 h` empurrou a inspeção de `100 h` para `1150 h` (não `1100 h`).
  4. Item com `monthCounting:"calendar"` venceu no último dia do mês (`2026-01-31`) e **não** recebeu projeção (limite de calendário).
  5. Regulatório vencido escalou para `BLOCKING`; `worstUrgency:"overdue"`.
  6. Rota inexistente devolveu `HTTP 404` com `{success:false,error:{code:"NOT_FOUND",...}}`.

### 10.4 Decisões de ambiente

1. **pnpm 10.34.5** substituiu o pnpm 12 (que escreve lockfile de 2 documentos YAML e travava o grafo do Nx). Instalado em `/tmp/opencode/pnpm10`; wrapper em `/tmp/opencode/bin/pnpm` porque o shim corepack global está corrompido.
2. **`.nxignore`** (`v1`, `repos-externos`, `dist`) — sem ele o Nx inferia 19 projetos falsos a partir de `v1/` (a árvore superseded poluía o grafo e quebrava o lint).
3. Nomes de projeto/aliases no padrão `@vortex/*` (o spec v4 usa `@vortex/shared-dto` e `@vortex/ui`).
4. `@swc/core` elevado para `~1.16.2` (o peer de `@swc-node/core` exigia `>=1.13.3`).

### 10.5 O que NÃO foi feito (lacunas explícitas)

1. **Sem validação de entrada**: nada de `ValidationPipe`/`class-validator`. Os contratos de request são interfaces (type-only), então corpo malformado cai em `INTERNAL_ERROR` (500) em vez de `VALIDATION_ERROR` (422). Corrigir exige DTOs de classe ou guardas explícitas.
2. **Sem persistência nem ledger**: nenhuma migração foi criada. Faltam `ops.aircraft_meter_readings` e `ops.compliance_items` (hoje só há `ops.aircraft.total_hours/total_cycles`, `ops.aircraft_logbooks.entries` em JSONB e `ops.airworthiness_directives.compliance_deadline`). Consequência: regras 1, 6 e 7 do contrato (ledger, idempotência, RLS) não foram exercidas.
3. **Sem frontend**: nenhum app Angular consome `shared-dto`/`util-aeronautics` ainda. `libs/ui`, `libs/core`, `libs/feature-*` não existem.
4. **Sem autenticação/RBAC/ABAC/RLS**: `ops-mro` é um serviço de cálculo sem contexto de tenant.
5. **`ops-mro-e2e` não roda**: o gerador criou o projeto com executor `@nx/jest:jest`, mas `@nx/jest` não está instalado. O spec foi atualizado para o novo contrato, porém a suíte permanece inexecutável até instalar o Jest (ou trocar por Vitest).
6. **Avisos de lint** (não erros): 2 diretivas `eslint-disable` ociosas nos arquivos de suporte do `ops-mro-e2e` gerados.
7. **Nada de 3.3/3.4/3.5/3.6/3.7** foi portado; apenas 3.1 e 3.2.
8. `v1/packages/domain-aeronautics` continua no repositório como referência histórica. A cópia canônica agora é `libs/util-aeronautics`.

### 10.6 Próximo passo proposto

1. Migração SQL `ops.aircraft_meter_readings` + `ops.compliance_items` (com RLS por `tenant_id`/`company_id`).
2. Módulo NestJS de escrita: carrega dados reais, chama o motor, grava leitura/item, ancora bloco no ledger e publica evento — com `Idempotency-Key`.
3. `libs/shared-dto`: DTOs de classe + `ValidationPipe` para fechar a lacuna 10.5.1 (422).
4. Só então `libs/ui`/`libs/core` e a tela Angular de conformidade.

---

*Nota final: o port inicial (seção 9) foi feito em `v1/`; a integração canônica (seção 10) foi feita no workspace Nx na raiz, com motor testado (49 testes), serviço NestJS `ops-mro` consumindo-o e envelope global verificado por HTTP real. As lacunas da seção 10.5 permanecem abertas.*

---

## 11. Registro eletrônico: ledger, idempotência, persistência e validação

Esta fase fechou as lacunas 10.5.1 (validação), 10.5.2 (persistência/ledger/idempotência) e 10.5.5/10.5.6 (e2e). O motor de cálculo passou a ter um fluxo de escrita completo, ancorado no ledger na **mesma transação** (regra 1 do contrato).

### 11.1 Migrações SQL (aplicadas em PostgreSQL 16)

| Arquivo | Conteúdo |
|---------|----------|
| `0001_extensions_schemas.sql` | Extensões (`pgcrypto`, `citext`) e schemas de domínio |
| `0002_identity.sql` | Núcleo dono da verdade: `tenants`, `users`, `companies`, `tenant_users`, `tenant_companies`, `relationships`, `proxies`, `professional_profiles`, `licenses`, `accreditations` |
| `0003_ledger_outbox.sql` | `ledger.ledger_blocks` (particionado, trigger anti-UPDATE/DELETE), `ledger.chain_heads`, `ledger.outbox_events` e `ledger.validate_deferred_reference()` |
| `0004_identity_ledger_rls.sql` | `identity.current_user_id()` / `current_tenant_ids()` / `current_company_ids()`, RLS por linha e grants de menor privilégio |
| `0005_mro_metering_compliance.sql` | `ops.aircraft` (subconjunto canônico), `ops.aircraft_meter_readings` (append-only por trigger), `ops.compliance_items`, `ops.compliance_reset_rules`, RLS tenant **e** empresa, ancoragem diferida no ledger |
| `0006_mro_meter_resets.sql` | `ops.meter_resets` (troca/zeragem de instrumento), RLS tenant **e** empresa, ancoragem diferida no ledger |

O RLS exige **tenant E empresa** (diferente da v1, que validava apenas tenant): usuário com vínculo de tenant mas sem vínculo ativo em `identity.relationships` não vê nem escreve. A leitura de medidor é imutável (Resolução 458/2017): corrigir é registrar nova leitura, nunca `UPDATE`.

O histórico de medidor é a única fonte de verdade; `ops.aircraft.total_hours`/`total_cycles` são **cache** desse histórico. A hora canônica é `airframe ?? tach ?? hobbs` (`canonicalHours`, no repositório) e o cache é atualizado de forma **monotônica** (`GREATEST`) a cada leitura nova: uma leitura atrasada (retroativa) alimenta a taxa, mas nunca faz o total regredir.

### 11.2 Plataforma do `ops-mro`

| Arquivo | Papel |
|---------|-------|
| `platform/database/database.service.ts` | `withContext()` abre transação e injeta `app.current_user_id/tenant/company` — o que as funções do RLS leem |
| `platform/redis/redis.service.ts` | Cliente Redis (idempotência, trava `NX`, TTL) |
| `platform/ledger/ledger.integrity.ts` | `stableStringify`, `canonicalLedgerBlock`, `blockHash` (SHA-256), `GENESIS_HASH` |
| `platform/ledger/ledger.service.ts` | `append()` encadeia SHA-256 + assina Ed25519 sob `pg_advisory_xact_lock` + `chain_heads FOR UPDATE`; `verifyChain()` valida encadeamento, hash e assinatura |
| `platform/http/request-context.middleware.ts` + `context.guard.ts` | Monta o `RequestContext` (hoje por cabeçalho; o `auth-service` substituirá) e nega `AUTH_REQUIRED` (401) sem contexto |
| `platform/http/api-response.interceptor.ts` + `api-exception.filter.ts` | Envelope `{ success, data, error }` no sucesso e na falha; `42501` do PostgreSQL (RLS) → `PERMISSION_DENIED` (403) |
| `platform/http/idempotency.interceptor.ts` | `Idempotency-Key` 16..128 chars; mesmo corpo devolve a resposta original; corpo diferente → `IDEMPOTENCY_CONFLICT` (409); trava `NX` evita execução concorrente |
| `platform/http/write-route.decorator.ts` | `@WriteRoute()` = `ContextGuard` + `IdempotencyInterceptor`, para nenhuma rota de mutação esquecer a regra 6 |

### 11.3 Rotas novas

`GET /api/ledger/verify` · `GET|POST /api/mro/aircraft` · `GET|POST /api/mro/aircraft/:id/meter-readings` · `GET|POST /api/mro/aircraft/:id/meter-resets` · `GET|POST /api/mro/aircraft/:id/compliance-items` · `GET /api/mro/aircraft/:id/compliance/assess` · `POST /api/mro/compliance/done` · `GET|POST /api/mro/compliance/reset-rules`.

As rotas de escrita gravam o registro e o bloco do ledger na mesma transação (`blockId` conhecido em memória). Toda escrita recebe DTO de classe validado por `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`), fechando o `VALIDATION_ERROR` (422).

### 11.4 Verificação executada

- `nx run-many -t typecheck lint test build`: verde nos 4 projetos; `@vortex/util-aeronautics:test` mantém **49 testes**.
- **RLS**: usuário com vínculo de tenant mas sem vínculo de empresa → `GET /api/mro/aircraft` devolve `[]`; `POST` devolve `403 PERMISSION_DENIED` (violação `42501` do banco).
- **Idempotência**: repetir `Idempotency-Key` com o mesmo corpo devolve o **mesmo** `aircraft.id` e a lista contém uma única aeronave; corpo diferente → `409 IDEMPOTENCY_CONFLICT`; sem chave → `409`.
- **Validação**: corpo com campo extra + `registration` inválida → `422 VALIDATION_ERROR` com as duas mensagens.
- **Conformidade persistida**: dois registros de `hobbs` alimentaram a taxa de utilização; item `INSPECAO_100H` (1100 h + 100 h) avaliado com `currentHours` da última leitura → `overdue` / `BLOCKING`; após `POST /compliance/done` → `nextDue.hours = 1300` e `urgency = upcoming`.
- **Ledger**: `GET /api/ledger/verify` na fixture retornou `{valid:true, blocks:2}`; na cadeia antiga (assinada por chave efêmera de execução anterior) retornou `valid:false` com `"Assinatura Ed25519 invalida."`, comprovando que a verificação de fato inspeciona a assinatura.
- **`ops-mro-e2e`** convertido de Jest (não instalado) para **Vitest**, hermético (`dependsOn: ["ops-mro:build","ops-mro:serve"]`, sobe o servidor de verdade): **10 testes verdes** (health, cálculo, 409, 422, RLS leitura/escrita, idempotência, verify do ledger, totais monotônicos, reset de medidor).
- **Totais monotônicos**: após leituras 100 → 900 → 200 (atrasada), `total_hours` permaneceu 900 — a leitura retroativa entra na taxa mas não regride o cache.
- **Reset de medidor**: com leituras `100/200/5000/5100` e um reset declarado em `2026-04-01`, o `POST /meter-resets` persiste, o `GET /meter-resets` devolve o registro e o intervalo que cruza o reset é descartado por inteiro — a taxa cai de ~27.6 h/dia (leitura ingênua do salto) para `< 2.5 h/dia`.

### 11.5 Scripts e fixtures

- `tools/migrate.mjs` — runner de migrações (`--status`), cria o papel `vortex_app` `NOBYPASSRLS`. **Sem `DB_APP_PASSWORD` o papel existente tem a senha preservada** (antes o runner sobrescrevia com a senha do admin e derrubava o runtime de dev); só um papel novo, criado sem senha informada, recebe a do admin.
- `tools/seed-dev.mjs` — seed de desenvolvimento: tenant/empresa/usuário com vínculo + usuário sem vínculo, e uma **fixture isolada** para verificar a cadeia do ledger sem herdar blocos de execuções anteriores.
- A chave Ed25519 de desenvolvimento é persistida em `.data/ledger-ed25519.pem` (fora do git): sem isso a cadeia gravada em uma execução não seria verificável na seguinte. Em produção, `LEDGER_PRIVATE_KEY_FILE` é obrigatório.

### 11.6 Correções de domínio (Fase B)

Ao exercitar o fluxo ponta a ponta com o servidor real (e não só o motor isolado), três defeitos de domínio apareceram e foram corrigidos:

1. **`total_hours`/`total_cycles` nunca eram atualizados** com as leituras novas — o cache ficava em `null` e a conformidade não enxergava horas acumuladas. Corrigido com `canonicalHours` + `GREATEST` (monotônico) na mesma transação da leitura.
2. **Resets de medidor não existiam no banco**: a taxa de utilização interpretava a troca de instrumento como horas voadas. Criados `ops.meter_resets`, DTO, rotas e uso na avaliação.
3. **`currentCycles` era sempre `null`**: a avaliação de itens por ciclo (`GOOD`/`due`) não funcionava. Passou a ler `ops.aircraft.total_cycles` e a exigir a aeronave (`findAircraft` → `404 NOT_FOUND` quando ausente).

### 11.7 O que NÃO foi feito (lacunas explícitas)

1. ~~**Autenticação real**~~ — **fechada na seção 12.1** (login JWT por vínculo; cabeçalhos viraram fallback só fora de produção).
2. ~~**Protocolo `AAAA-NNNNNN`**~~ — **fechada na seção 12.2**. Publicação de eventos no RabbitMQ segue aberta: o `outbox` agora é gravado na mesma transação do bloco, mas **nada publica ainda** (seção 12.4).
3. **Frontend Angular** (`libs/ui`, `libs/core`, `feature-*`) continua inexistente; nenhuma tela consome os contratos.
4. **`claim` de idempotência**: a resposta é gravada após o handler; uma falha de processo entre o commit e o `SET` no Redis permite reexecução (a chave só protege contra concorrência, não contra crash). Aceitável para a fase; endurecer exige gravar a intenção antes do handler.
5. **`verifyChain` é O(n) em memória** — adequado para auditoria pontual, não para cadeias muito longas.
6. ~~**Empacotamento**~~ — **fechada na seção 12.3**: `Dockerfile` multi-stage + serviço `api` no `docker-compose.yml`, aplicando migrações no boot.
7. Apenas as fontes 3.1 e 3.2 foram portadas; 3.3–3.7 seguem não incorporadas.
8. **Licenças** continuam a exigir revisão antes de qualquer reuso literal (seção 6).

### 11.8 Próximo passo proposto

1. ~~Serviço `api` no `docker-compose.yml`~~ — feito (12.3).
2. ~~`auth-service` mínimo (JWT + tenant/empresa no token)~~ — feito (12.1).
3. ~~`protocol-service` (`AAAA-NNNNNN`) integrado ao fluxo de escrita~~ — feito (12.2); falta o `outbox` → RabbitMQ.
4. Primeiro app Angular (`libs/ui` + `libs/core` + tela de conformidade) consumindo `@vortex/shared-dto`.
5. Endurecer a idempotência (gravar intenção antes do handler) e migrar o segredo do ledger para secret manager.

---

## 12. Identidade, protocolo e empacotamento (v4)

Esta fase fechou três lacunas da seção 11: autenticação real (11.7.1), protocolo `AAAA-NNNNNN` (11.7.2) e o serviço `api` no Compose (11.7.6). O alvo canônico continua sendo o workspace Nx na raiz.

### 12.1 Autenticação: login JWT por vínculo

| Arquivo | Papel |
|---------|-------|
| `migrations/0007_identity_credentials.sql` | `identity.credentials` (hash bcrypt) + funções `SECURITY DEFINER` `identity.set_password` / `identity.verify_password` (lockout: 5 falhas → 15 min) e `identity.memberships` |
| `platform/auth/jwt.service.ts` | Assina/valida **HS256** com `iss`/`aud`; token expirado → `TOKEN_EXPIRED` (401) |
| `platform/auth/auth.service.ts` | `login` (senha verificada **no banco**, nunca em memória) e escolha de vínculo quando o usuário pertence a mais de um tenant/empresa |
| `platform/auth/auth.controller.ts` | `POST /api/auth/login` (`@IdempotentRoute`) · `GET /api/auth/me` |
| `platform/http/request-context.middleware.ts` | Passa a derivar o `RequestContext` do **Bearer JWT**; cabeçalhos `x-user-id`/`x-tenant-id`/`x-company-id` só valem com `AUTH_ALLOW_HEADER_CONTEXT=true` (default ligado apenas fora de produção), para não virar bypass em produção |

`LoginResponse` carrega os vínculos do usuário; o cliente escolhe e o token passa a fixar `tenant_id`/`company_id`. O RLS continua sendo a última linha de defesa: mesmo um token válido de um tenant não enxerga linhas de outro.

### 12.2 Protocolo eletrônico `AAAA-NNNNNN`

| Arquivo | Papel |
|---------|-------|
| `migrations/0008_protocol.sql` | `protocol.protocol_counters` + `protocol.protocols` (RLS tenant **e** empresa, `CHECK` do formato) + `protocol.next_number` `SECURITY DEFINER` (o app não toca no contador) |
| `platform/protocol/protocol.service.ts` | `issue()` roda com o **mesmo `SqlClient`** da transação de domínio (como o ledger) e já grava `ledger_block_id` no `INSERT` — sem `UPDATE` posterior (não há policy de UPDATE) |
| `platform/protocol/protocol.controller.ts` | `GET /api/protocols/:protocolNumber` (leitura sob RLS; outro tenant → `404`) |

`POST /api/mro/compliance/done` agora devolve `protocolNumber` junto do `ledgerBlockId`: a execução de conformidade tem bloco no ledger **e** protocolo, ambos na mesma transação.

### 12.3 Empacotamento e Compose

| Arquivo | Papel |
|---------|-------|
| `Dockerfile` | Multi-stage `deps → build (Nx) → runtime`. Base `node:22-slim` (glibc): o pnpm 10.x não distribui binário nativo musl |
| `docker/entrypoint.sh` | Espera PostgreSQL/Redis, gera a chave Ed25519 se ausente, aplica migrações (idempotente), seed opcional (`SEED_ON_BOOT`), `exec` do processo |
| `docker-compose.yml` / `docker-compose.prod.yml` | `pg` + `redis` + `rabbitmq` + `minio` + **`api`** (porta 3400); prod exige segredos (`:?`), `restart: always` e só o `api` exposto |
| `Makefile` | `install build verify serve infra-up up down migrate seed ledger-key prod-up backup restore` |
| `tools/gen-ledger-key.mjs` | Gera par Ed25519 para produção (`.secrets/`, fora do git) |

O `entrypoint.sh` é o que torna o container auto-suficiente: sobe o banco vazio e sai com schema aplicado, sem passo manual.

Duas correções só apareceram ao rodar **fora** do monorepo, no container:
`tslib` precisou entrar como dependência de runtime do `apps/ops-mro` (o webpack o externaliza; sem ele, `require('tslib')` dava `MODULE_NOT_FOUND`); e os `healthcheck` da imagem são ignorados pelo formato OCI do Podman, então foram declarados também no Compose. Isso motivou incluir o smoke test de imagem na bateria de verificação.

### 12.4 Verificação executada

- `nx run-many -t typecheck lint build`: verde nos 4 projetos.
- **`ops-mro-e2e`: 16 testes verdes**, incluindo os 5 de autenticação (login OK; credenciais inválidas → 401; usuário sem vínculo → 403; Bearer resolve o contexto; token adulterado/ausente → 401) e o de protocolo (emissão `AAAA-NNNNNN`, leitura pelo autor, `404` para outro tenant).
- **Outbox**: cada bloco agora insere uma linha em `ledger.outbox_events` na mesma transação; verificado por contagem (`pending == total`).
- **`podman-compose config`** validado nas duas composições (dev e prod).
- **Container real**: `podman build` da imagem `vortex-ops-mro:dev` conclui; o `entrypoint.sh` espera PostgreSQL/Redis, gera a chave Ed25519, aplica migrações e (com `SEED_ON_BOOT=true`) o seed. `GET /api/health` → verde; `POST /api/auth/login` emite token; `GET /api/auth/me` resolve o contexto; usuário sem vínculo → `403`; token adulterado → `401`.
- **Stack Compose (banco novo)**: `podman-compose … up postgres redis api` sobe os três serviços; a API aplica as 8 migrações em banco vazio e o seed no boot. Fluxo ponta a ponta executado dentro do stack: aeronave → item de conformidade → `POST /compliance/done` → protocolo `2026-000001` com `ledgerHash`; `GET /api/ledger/verify` → `{valid:true, blocks:3}`, fechando a DoD "roda em Docker Compose; `/health` verde".
- **Imagens qualificadas** (`docker.io/library/...`) para dispensar `unqualified-search-registries`, e `image:` explícito no serviço `api` para permitir `--no-build` reaproveitando a imagem já compilada.

### 12.5 O que NÃO foi feito (lacunas explícitas)

1. **Publicação no RabbitMQ**: `ledger.outbox_events` é gravado atomicamente com o bloco, mas **nenhum consumidor publica** nem marca `published_at`. Fila e exchange existem no Compose; falta o publisher.
2. **2FA e RBAC/ABAC fino**: o login é senha + JWT; não há segundo fator nem política de permissão por papel (hoje quem manda é o vínculo + RLS).
3. **Refresh token**: só `access` de vida curta; sem rotação de refresh ainda.
4. **Frontend Angular** continua inexistente.
5. **Idempotência**: `claim` gravado após o handler (crash entre commit e `SET` permite reexecução).
6. **`verifyChain` O(n)** — auditoria pontual, não cadeia longa.
7. **Licenças** (seção 6) seguem exigindo revisão antes de reuso literal.
8. A chave Ed25519 de dev fica em `.data/`; produção exige `LEDGER_PRIVATE_KEY_FILE` (secret manager ainda não integrado).

### 12.6 Próximo passo proposto

1. Publisher do outbox → RabbitMQ (worker + `published_at`) e consumidores idempotentes.
2. Refresh token com rotação e revogação por sessão (Redis).
3. Primeiro app Angular (`libs/ui` + `libs/core` + tela de conformidade) consumindo `@vortex/shared-dto`.
4. Endurecer a idempotência (gravar intenção antes do handler) e mover o segredo do ledger para secret manager.

---

## 13. Frontend Angular: `mro-web` + `libs/ui` + `libs/core`

Esta fase fecha o item 12.6.3 — o frontend Angular, que era a maior lacuna aberta. Ele **não** valida regra regulatória: apenas apresenta o que o servidor decidiu, coerente com a regra 4 (validação soberana no backend).

### 13.1 Camadas e bibliotecas

| Camada | Projeto | Papel |
|--------|---------|-------|
| Build/runtime | `apps/mro-web` | App Angular 20 standalone, rotas lazy, `ChangeDetectionStrategy.OnPush` e **zoneless** (`provideZonelessChangeDetection`) |
| Visual | `libs/ui` (`@vortex/ui`) | Design System sem estado de domínio: `VxPageHeader`, `VxCard`, `VxMetricCard`, `VxUrgencyBadge`, `VxEmptyState`, `VxLoading`; tema M3 (`mat.theme` azure/cyan) + tokens `light-dark()` |
| Acesso/estado | `libs/core` (`@vortex/core`) | `ApiClient` (desembrulha o envelope e normaliza erro em `VortexApiError`), `SessionStore`/`AuthService`, interceptor Bearer + `Idempotency-Key`, guards, `ThemeService`, `MroService`, `AuditService` |
| Contratos | `libs/shared-dto` | As mesmas formas usadas pelo backend, agora também `LedgerVerification` (movido do servidor para cá) |

O `tsconfig.base.json` mapeia `@vortex/core`, `@vortex/ui`, `@vortex/shared-dto` e `@vortex/util-aeronautics`; o app resolve tudo por esses aliases.

### 13.2 Telas

| Rota | Componente | Conteúdo |
|------|-----------|----------|
| `/entrar` | `LoginPage` | Formulário reativo + Material, contas de demonstração do seed (`dono@vortex.dev`, `semvinculo@vortex.dev`) |
| `/conformidade` | `ComplianceDashboardPage` | Pior urgência por aeronave, contagens de vencidos/a vencer, cadastro de aeronave |
| `/conformidade/:aircraftId` | `AircraftCompliancePage` | Ficha da aeronave: métricas (horas/ciclos/utilização), itens e urgências, registro de execução (devolve **protocolo** + bloco do ledger), leituras de medidor e novo item |
| `/aeronaves` | `AircraftListPage` | Tabela de frota do vínculo, atalho para a ficha |

O `AppShell` mantém o contexto (tenant/empresa), o alternador de tema e um rodapé que exibe a **integridade do ledger** lida de `GET /api/ledger/verify` — a prova regulatória fica visível em toda tela.

### 13.3 Limites de módulo e verificação

- `eslint.config.mjs` deixou de ser permissivo (`sourceTag: '*'`): agora há `depConstraints` por `type` — `app` → `{core, ui, contracts, util}`; `core`/`ui` → `{core|ui, contracts, util}`; `util` → `{util, contracts}`; `contracts` → `{contracts}`. Aplicação não depende de aplicação.
- `apps/mro-web/proxy.conf.json` faz proxy de `/api` → `http://localhost:3400`; `allowedHosts` inclui `.monkeycode-ai.live` para o preview da plataforma.
- `zone.js` entrou como devDependency **só para o TestBed** (o bundle continua zoneless; `polyfills` não inclui `zone.js`).
- Testes: `mro-web` cobre o bootstrap e a `AircraftCompliancePage` (com `HttpTestingController`, incluindo o caminho "aeronave fora do vínculo"); `ui` cobre o selo de urgência; `core` cobre a normalização de erro do envelope.

### 13.4 Verificação executada

- `nx run-many -t typecheck lint test build`: **verde nos 7 projetos**.
- `nx build mro-web`: bundle de produção OK (initial ~287 kB; `aircraft-compliance-page` em chunk lazy).
- **Dev server + proxy real** (`nx serve mro-web`, porta 4200 → API 3400): `GET /api/health` pelo proxy OK; `POST /api/auth/login` do `dono@vortex.dev` emite token; `GET /api/auth/me` resolve o contexto (tenant `…1111`, empresa `…2222`); `GET /api/mro/aircraft` devolve as aeronaves do vínculo; token adulterado → 401.
- `ops-mro-e2e`: **16 testes verdes** contra o servidor em execução (RLS do usuário sem vínculo continua provada).

### 13.5 O que NÃO foi feito (lacunas explícitas)

1. ~~**Publicação no RabbitMQ**~~ — **fechada na seção 14**: o worker publica no exchange `vortex.events` e marca `published_at` na mesma transação.
2. **Cobertura de UI parcial**: só a ficha de conformidade tem teste de componente; dashboard, lista e shell contam com o teste de bootstrap.
3. **Module Federation e subdomínios**: o app é standalone, sem shell federado compartilhando a Central de Comunicação.
4. **2FA/RBAC fino e refresh token**: o frontend já envia Bearer e `Idempotency-Key`, mas não há segundo fator nem rotação de sessão.
5. **Cadeia do ledger no tenant de dev**: a base acumulada em sessões anteriores foi assinada por uma chave Ed25519 já rotacionada, então `verify` acusa `valid:false` no tenant `…1111`. É dado de desenvolvimento; o tenant fixture (`…1112`) verifica `valid:true`. O comportamento do rodapé (exibir a falha) é o esperado.
6. **`util-aeronautics` não roda no browser**: o cálculo vive no backend; o frontend só apresenta — como planejado.

### 13.6 Próximo passo proposto

1. Consumidores idempotentes do bus (dedup por `messageId`) e dead-letter queue.
2. Testes de componente para dashboard, lista e shell; teste de integração do interceptor (`Idempotency-Key` em mutação).
3. Central de Comunicação e Module Federation (Shell entre subdomínios).
4. 2FA/RBAC fino e refresh token com rotação.

---

## 14. Publisher do outbox no RabbitMQ

Fecha o item 13.6.1: os eventos que já eram gravados atomicamente com o bloco do ledger passam a sair para o bus, sem acoplar a escrita da API ao broker.

### 14.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0009_outbox_publisher.sql` | `next_attempt_at` + funções `SECURITY DEFINER`: `ledger.claim_outbox_batch(integer)`, `ledger.mark_outbox_published(uuid[])`, `ledger.mark_outbox_failed(uuid, text)` |
| Tradução pura | `apps/ops-mro/src/app/platform/bus/outbox-message.ts` | Linha do outbox → `BusMessage` (`messageId`, `type`, tenant/empresa/usuário, `occurredAt`, `payload`) e a routing key |
| Transporte | `apps/ops-mro/src/app/platform/bus/rabbitmq.service.ts` | `RabbitMqEventBus` (amqplib, `ConfirmChannel`) publicando no exchange topic `vortex.events`; reconexão por eventos `error`/`close` |
| Worker | `apps/ops-mro/src/app/platform/bus/outbox-publisher.service.ts` | Ciclo `claim` → publica → `mark_published` na **mesma transação**; falha vira `last_error` + backoff, sem derrubar a API |
| Wiring | `apps/ops-mro/src/app/platform/bus/bus.module.ts` + `app.module.ts` | `BusModule` global (`EVENT_BUS`, `OutboxPublisher`) |

- **Sem duplicidade entre instâncias:** `claim_outbox_batch` usa `FOR UPDATE SKIP LOCKED` e as linhas ficam travadas até o COMMIT, então dois workers nunca pegam o mesmo evento.
- **At-least-once:** se o COMMIT falhar depois da publicação, o evento volta a pendente; o consumidor deve deduplicar por `messageId`.
- **Resiliência:** o canal é preguiçoso (`RABBITMQ_URL` ausente = eventos só gravados) e o worker reconecta após queda do broker; o backoff é `least(2^attempts * 5s, 1h)`.
- **Mensagem:** `deliveryMode=2`, `messageId` = id do outbox, `type` = `event_type`, headers `tenantId`/`companyId` e corpo JSON com o envelope do evento.

### 14.2 Verificação executada

- `nx typecheck/lint/build ops-mro` e a suíte completa (`run-many -t typecheck lint test build`): **verde nos 7 projetos**; `ops-mro-e2e`: **16 testes verdes**.
- **Fluxo feliz** (broker no ar): criação de aeronave → `201`, bloco no ledger e evento consumido em `vortex.events` (`ops.aircraft.AIRCRAFT_CREATED`) com `messageId`, headers e payload corretos; `published_at` marcado.
- **Queda do broker:** API continua respondendo `201`; o evento fica pendente com `attempts` incrementado, `last_error='Channel closed'` e `next_attempt_at` no futuro.
- **Reconexão:** ao religar o broker e vencer o backoff, o mesmo evento é publicado (`published_at` marcado) e chega ao consumidor com o `messageId` original — provando o at-least-once ponta a ponta.

### 14.3 O que NÃO foi feito (lacunas explícitas)

1. **Nenhum consumidor** do bus ainda; a dedup por `messageId` é contrato do futuro consumidor.
2. **Sem dead-letter queue** declarada: falhas ficam em `outbox_events` com backoff, sem limite de tentativas nem DLQ.
3. **Sem teste automatizado do publisher**: a verificação acima foi manual (broker via Podman); não há teste de integração que suba o RabbitMQ no CI.
4. **`verifyChain`/bus não compartilham auditoria de publicação**: não há métrica/exposto de lag do outbox.

---

*Nota final 4: a seção 11 fechou validação, persistência, ledger, idempotência e e2e; a seção 12 fechou autenticação (JWT), protocolo (`AAAA-NNNNNN`) e empacotamento (Compose com serviço `api`); a seção 13 fechou o frontend Angular (`mro-web` + DS + núcleo de acesso); a seção 14 fechou a publicação do outbox no RabbitMQ. Permanecem abertas, por decisão de escopo: consumidores idempotentes/DLQ, 2FA/RBAC fino, refresh token e Module Federation.*

---

## 15. Consumidor idempotente de eventos, DLQ e projeção de alertas

Fecha os itens 14.3.1 e 14.3.2: o bus deixa de ser apenas saída. Um consumidor
deduplica por `messageId`, retenta com atraso, descarta na dead-letter queue no
limite e mantém uma projeção de estado para o Hub de Alertas Preditivos.

### 15.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0010_event_consumers.sql` | `ledger.consumer_inbox` (dedup por `consumer_name + message_id`) + funções `SECURITY DEFINER` `begin_consumer_message` / `mark_consumer_processed` / `mark_consumer_failed`; `notifications.alerts` + `notifications.project_alerts(...)` |
| Registro | `apps/ops-mro/src/app/platform/bus/event-handler.ts` | Interface `EventHandler` e `EventHandlerRegistry` (tipo de evento → handler) |
| Worker | `apps/ops-mro/src/app/platform/bus/event-consumer.service.ts` | Consome `ops-mro.events`, declara a topologia (fila principal → retry → DLQ), dedup, retry com TTL e descarte |
| Handler | `apps/ops-mro/src/app/mro/compliance-alert.handler.ts` + `alert-projection.ts` | Reavalia a conformidade da aeronave e projeta os alertas correntes |
| Leitura | `GET /api/mro/alerts` (`mro.controller.ts` / `mro.service.ts` / `mro.repository.ts`) | Alertas correntes no contexto do tenant/empresa |

- **Idempotência:** a inbox tem chave primária `(consumer_name, message_id)`. Se a mensagem já foi `PROCESSED`, o handler não roda de novo; em reentrega por crash entre efeito e `mark_processed`, o handler converge porque a projeção é um upsert de estado.
- **Retry com atraso:** `nack(requeue=false)` manda para a fila de retry, que devolve a mensagem à fila principal após `x-message-ttl` (10s por padrão). Evita o laço quente de um `requeue=true`.
- **DLQ:** passado o teto (`CONSUMER_MAX_ATTEMPTS`, 5), a mensagem vai para `ops-mro.events.dlq` com header `x-error`, e a inbox fica `DEAD`. A fila nunca trava.
- **Projeção de estado, não histórico:** `notifications.alerts` guarda um alerta corrente por item; itens que saem da urgência são resolvidos (`resolved_at`). Nada de histórico paralelo ao ledger — o Hub apenas exibe o estado derivado.
- **Configuração:** `CONSUMER_RETRY_MS`, `CONSUMER_MAX_ATTEMPTS`, `CONSUMER_PREFETCH`; sem `RABBITMQ_URL` o consumidor não sobe e a API segue normal.

### 15.2 Verificação executada

- `nx run-many -t typecheck lint test build`: **verde nos 7 projetos**; `ops-mro-e2e`: **18 testes verdes** (2 novos: forma do envelope e RLS do `GET /api/mro/alerts`); `nx test ops-mro`: **4 testes** (helpers de projeção).
- **Projeção ponta a ponta:** aeronave + leitura (`airframe=1500`) + item vencido (`intervalHours=100`, `lastDoneHours=1000`) → o consumidor projeta `GET /api/mro/alerts` com `severity=BLOCKING`, `urgency=overdue` e `detail="400 h excedidas"`.
- **Dedup:** o mesmo evento publicado duas vezes vira uma única linha `PROCESSED|1` na inbox.
- **Retry + DLQ:** evento apontando para aeronave inexistente falha 5 vezes (`FAILED` → `DEAD`) e aparece em `ops-mro.events.dlq` com `x-error="Aeronave nao encontrada."`.

### 15.3 O que NÃO foi feito (lacunas explícitas)

1. **Sem profundidade das filas do RabbitMQ** (exige plugin de management no container); o lag do outbox passou a ser exposto na seção 16.
2. **Teste automatizado do consumidor no CI**: a verificação de retry/DLQ acima é manual (RabbitMQ via Podman); a suíte e2e cobre o endpoint de alertas, não o consumo.
3. **Um único consumidor** (`ops-mro`): a inbox e a topologia já suportam outros apps, mas não há segundo consumidor para provar o isolamento entre apps.
4. **Entrega at-least-once com efeito idempotente**: garantido por contrato do handler; não há ordenação causal entre eventos (o consumidor processa na ordem de chegada da fila).

---

*Nota final 5: a seção 15 fechou o consumidor idempotente, a dead-letter queue e a projeção de alertas do Hub Preditivo. Permanecem abertas, por decisão de escopo: métrica de lag do outbox, 2FA/RBAC fino, refresh token, Central de Comunicação e Module Federation.*

---

## 16. Teto de tentativas e métricas do outbox/bus

Fecha a lacuna 15.3.1. O outbox deixa de retentar indefinidamente e passa a
expor o atraso da fila e o estado do consumidor.

### 16.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0011_outbox_metrics.sql` | `abandoned_at` + `ledger.mark_outbox_failed(uuid, text, integer)` (teto) + `ledger.outbox_metrics()` / `ledger.inbox_metrics(text)` |
| Worker | `apps/ops-mro/src/app/platform/bus/outbox-publisher.service.ts` | Passa `OUTBOX_MAX_ATTEMPTS` (10 por padrão) ao marcar falha |
| Métricas | `apps/ops-mro/src/app/platform/bus/bus-metrics.service.ts` + `bus-metrics.ts` | Leitura dos helpers `SECURITY DEFINER` e normalização (bigint→number, data ISO) |
| Endpoint | `GET /api/health/bus` (`health.controller.ts`) | `outbox` (pending/abandoned/published/lag/maxPendingAttempts) e `consumer` (processed/failed/dead/processing) |

- **Teto de tentativas:** ao atingir `OUTBOX_MAX_ATTEMPTS`, o evento é marcado `abandoned_at` e **não é apagado** (o bloco do ledger continua íntegro); sai da varredura de `claim_outbox_batch` e aparece no contador `abandoned`. Reprocessar é uma intervenção de operador (não há re-drive automático).
- **Métrica:** `lag_seconds` é o tempo desde o evento pendente mais antigo; `max_pending_attempts` antecipa um evento problemático. Sem contexto de tenant — só contagens agregadas.
- **Configuração:** `OUTBOX_MAX_ATTEMPTS`.

### 16.2 Verificação executada

- SQL (transação revertida, sem deixar dado): tentativa 9/10 apenas agenda backoff; tentativa 10 marca `abandoned_at`, não reagenda e some de `claim_outbox_batch`; `outbox_metrics().abandoned` reflete o evento.
- `GET /api/health/bus` responde com `outbox` e `consumer` no envelope; e2e cobre a forma da resposta.
- `nx run-many -t typecheck lint test build`: verde nos 7 projetos; `nx test ops-mro`: 7 testes.

### 16.3 O que NÃO foi feito (lacunas explícitas)

1. **Re-drive feito na seção 17** (rota administrativa auditada).
2. **Sem profundidade das filas do RabbitMQ**: exige habilitar o plugin de management no container; a métrica cobre o lado do banco.
3. **Alarme feito na seção 17** (tabela `notifications.bus_alarms`); falta apenas o disparo por e-mail/in-app.

---

*Nota final 6: a seção 16 fechou o teto de tentativas e as métricas do outbox/bus (incluindo o lag). Permanecem abertas, por decisão de escopo: re-drive de eventos abandonados, profundidade de filas do RabbitMQ, 2FA/RBAC fino, refresh token, Central de Comunicação e Module Federation.*

---

## 17. Re-drive de eventos abandonados e alarmes do bus

Fecha as lacunas 16.3.1 e 16.3.3. O bus passa a ter operação de recuperação e
vigilância: um evento abandonado volta à fila por ação de um administrador do
tenant, e o monitor abre alarmes quando o atraso ou o descarte passam do
limiar.

### 17.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Autorização | `identity.can_administer(uuid, uuid)` (`0012`) | `true` se o usuário tem vínculo ACTIVE com papel `ADMIN`/`CRIADOR_EMPRESA` no tenant |
| Re-drive | `ledger.redrive_abandoned_outbox_events(uuid, integer, uuid[])` (`0012`) | Reinicia `abandoned_at`/`attempts`/`last_error` dos abandonados do tenant e devolve os ids devolvidos à fila |
| Rota | `apps/ops-mro/src/app/platform/bus/bus.controller.ts` + `outbox-redrive.service.ts` | `POST /api/bus/redrive`: contexto + `Idempotency-Key` + auditoria no ledger (`OUTBOX_REDRIVEN`) na mesma transação |
| Alarmes | `notifications.bus_alarms` + `notifications.sync_bus_alarms(jsonb)` (`0012`) | Estado corrente: um alarme aberto por `code`; o que normalizou é resolvido |
| Avaliação | `apps/ops-mro/src/app/platform/bus/bus-alarm.ts` + `bus-alarm.spec.ts` | Função pura `metrics → alarmes` (limiares de lag, abandonados, dead-letter) |
| Monitor | `apps/ops-mro/src/app/platform/bus/bus-monitor.service.ts` | Ciclo periódico que lê as métricas, avalia e sincroniza os alarmes |

- **Re-drive é escopado ao tenant do contexto:** a função filtra por `tenant_id`; um administrador de outro tenant recebe `PERMISSION_DENIED` (verificado em SQL e e2e). O evento não é apagado nem reescrito.
- **Auditoria:** o re-drive âncora um bloco no ledger na mesma transação, com o número e os ids devolvidos à fila.
- **Alarme é estado, não histórico:** `bus_alarms` tem um registro aberto por `code`; reabrir atualiza a linha e normalizar resolve. O histórico fica no log do monitor.
- **Limiares:** `OUTBOX_LAG_WARN_SECONDS` (300), `OUTBOX_LAG_CRITICAL_SECONDS` (1800), `BUS_MONITOR_MS` (30s). Sem `RABBITMQ_URL`, o monitor não sobe.

### 17.2 Verificação executada

- SQL: `can_administer` devolve `true` para o admin e `false` para o usuário sem vínculo; `redrive_abandoned_outbox_events` reinicia tentativas/erro do evento abandonado e devolve `[]` para outro tenant; `sync_bus_alarms` abre e resolve o alarme.
- e2e: `GET /api/health/bus` traz `alarms`; `POST /api/bus/redrive` sem `Idempotency-Key` → 409; com usuário sem papel → 403 `PERMISSION_DENIED`; com administrador → 201 com `redriven`.
- `nx run-many -t typecheck lint test build`: verde nos 7 projetos; `nx test ops-mro`: 13 testes (6 novos de avaliação de alarme).

### 17.3 O que NÃO foi feito (lacunas explícitas)

1. **Sem disparo dos alarmes do bus**: eles são gravados e expostos, mas ainda não saem por e-mail/in-app (Central de Comunicação) nem para o Hub Preditivo da Shell.
2. **Sem profundidade das filas do RabbitMQ**: exige habilitar o plugin de management no container; a vigília cobre o lado do banco.
3. **Papel único de administração**: `can_administer` aceita `ADMIN`/`CRIADOR_EMPRESA`; não há RBAC fino por permissão (ex.: só `pode_operar_bus`).

---

*Nota final 7: a seção 17 fechou o re-drive de eventos abandonados e os alarmes de atraso/descarte do bus, encerrando a operação do barramento. Permanecem abertas, por decisão de escopo: disparo dos alarmes por e-mail/in-app, profundidade das filas do RabbitMQ, 2FA/RBAC fino, refresh token, Central de Comunicação e Module Federation.*

---

## 18. Refresh token com rotação e detecção de reuso

Fecha a lacuna de sessão curta: até aqui o único token era o JWT de 1h e, ao
vencer, o usuário era deslogado. Agora o login abre uma **família** de refresh
tokens opacos que são rotacionados a cada uso; reapresentar um token já usado
revoga a família inteira (sinal de vazamento). O frontend renova a sessão de
forma silenciosa e repete a requisição que tomou `TOKEN_EXPIRED`.

### 18.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0013_refresh_tokens.sql` (+ `0014_fix_rotate_refresh_token.sql`) | `identity.refresh_tokens` (id, família, hash SHA-256, expiração, uso, revogação) e funções `SECURITY DEFINER` `issue_refresh_token` / `rotate_refresh_token` / `revoke_refresh_family` |
| Geração | `apps/ops-mro/src/app/platform/auth/refresh-token.service.ts` | Segredo opaco (32 bytes, base64url), `familyId`, TTL (`REFRESH_TTL_SECONDS`, 30 dias) e o hash SHA-256 persistido |
| Serviço | `apps/ops-mro/src/app/platform/auth/auth.service.ts` | `login` emite o par; `refresh` rotaciona e reconfere o vínculo; `logout` revoga a família |
| Rotas | `auth.controller.ts` + `auth.dto.ts` | `POST /api/auth/refresh` e `POST /api/auth/logout` (públicas quanto ao contexto, com `Idempotency-Key`) |
| Contrato | `libs/shared-dto/src/lib/auth-api.ts` | `LoginResponse` ganha `refreshToken`/`refreshExpiresIn`; `RefreshRequest` |
| Sessão | `libs/core/src/lib/auth/session.store.ts` | Persiste o refresh token; `isAuthenticated` vale enquanto access **ou** refresh estiver vivo |
| Renovação | `libs/core/src/lib/auth/auth.interceptor.ts` + `auth.service.ts` | No `TOKEN_EXPIRED`, uma renovação compartilhada e o retry com a **mesma** `Idempotency-Key`; falha encerra a sessão |

- **Rotação atômica no banco:** `rotate_refresh_token` valida, detecta reuso/expiração e, se tudo certo, grava o sucessor e marca o antigo (`used_at`, `replaced_by`) na mesma transação, com `FOR UPDATE`.
- **Detecção de reuso:** usar duas vezes o mesmo token retorna `REUSED` e revoga **todos** os tokens vivos da família; o sucessor deixa de valer.
- **Vínculo reconferido a cada renovação:** o refresh consulta `identity.memberships` e exige o vínculo ACTIVE de tenant/empresa; perdê-lo revoga a família e responde `PERMISSION_DENIED` — não se emite token para contexto que o RLS não liberaria.
- **Segredo nunca persistido em claro:** a resposta traz o token uma vez; o banco guarda apenas o SHA-256 (índice único). A tabela tem RLS forçado **sem política**: o app só a toca por funções `SECURITY DEFINER`.
- **Sem laço no cliente:** requisições a `/auth/*` nunca disparam renovação; uma única renovação em voo é compartilhada (`shareReplay`) por todas as chamadas que expiraram juntas.

### 18.2 Verificação executada

- Fluxo manual (`/tmp/opencode/refresh-check.mjs`): `login` devolve refresh token; `refresh` troca o par e o access novo é aceito em `GET /api/auth/me`; reusar o token antigo → `401 AUTH_REQUIRED`; o sucessor, após a família revogada, também → `401`; token desconhecido → `401`; `logout` devolve `revoked` e o refresh posterior → `401`.
- `nx e2e ops-mro-e2e`: **26 testes verdes** (4 novos: rotação, reuso, logout, exigência de `Idempotency-Key`/token desconhecido).
- `nx test ops-mro`: **16 testes** (3 novos de `RefreshTokenService`); `nx test core`: **9 testes** (3 novos do interceptor: Bearer+chave, renovação+retry, falha encerra a sessão).
- `nx run-many -t typecheck lint test build`: verde nos 7 projetos (a tarefa `ui:test` foi marcada como flaky pelo Nx e passou na reexecução; `ui` não foi tocado por esta seção).

### 18.3 O que NÃO foi feito (lacunas explícitas)

1. **Sem limite por dispositivo nem listagem de sessões**: não há rota para o usuário ver/revogar sessões ativas além do próprio `logout`.
2. **Sem revogação por troca de senha**: `identity.set_password` não revoga as famílias existentes; ficaria num gancho de evento.
3. **Detecção de reuso é reativa**: a família cai no primeiro reuso; não há alerta proativo (e-mail/in-app) desse evento de segurança.
4. **Sem rotação do segredo JWT (`kid`)**: o access token segue HS256 com segredo único.
5. **Sem rotina de limpeza**: tokens expirados/revogados permanecem em `identity.refresh_tokens`; falta um job de retenção.

---

## 19. Shell federada (Module Federation entre subdomínios)

Fecha a lacuna do "shell federado": o quadro do VORTEX deixa de ser copiado em
cada app. O `shell-web` e o **host** (`app.vortex.com`) e dono do chrome, do
portal e da sessao; cada dominio e um **remote** publicado no proprio subdominio
que expoe apenas as suas rotas. O `mro-web` passa a servir dois papeis com o
mesmo codigo: remote sob o host e app completo quando roda sozinho em
`mro.vortex.com`.

### 19.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Chrome | `libs/shell/src/lib/vortex-shell.ts` (`@vortex/shell`) | `VortexShell`: marca, navegacao declarada pelo hospedeiro (`nav`), Central de Comunicacao, contexto do vinculo, tema, rodape com a prova do ledger e logout; `<ng-content>` recebe a saida de rota |
| Central | `libs/shell/src/lib/communication-center.ts` | Os 4 modulos (Chat, Alertas, E-mails, Comunicados) + ciclo de tema, alimentados por `CommunicationStore`; a Shell so **exibe** |
| Acesso | `libs/shell/src/lib/login-page.ts` | Tela de login movida do `mro-web` para ser a mesma no host e nos MFEs |
| Estado | `libs/core/src/lib/communication/communication.store.ts` | Contadores por modulo (signals) e o token `APP_BASE_PATH` |
| Host | `apps/shell-web/**` | `module-federation.config.ts` (`remotes: ['mro-web']`), `webpack.prod.config.ts` (remote em `https://mro.vortex.com`), `app.routes.ts` (portal + `mro` por `loadChildren` federado com `APP_BASE_PATH='/mro'`), `portal-home-page.ts` (os 8 apps, so o MRO ativo) e `project.json` (serve na porta 4300) |
| Remote | `apps/mro-web/**` | `module-federation.config.ts` (`name: 'mro-web'`, `exposes: { './Routes': mro.routes.ts }`), `main.ts` → `bootstrap.ts`, rotas relativas e `mro-shell` standalone reusando `@vortex/shell`; serve na porta 4301 |
| Tipos | `apps/shell-web/src/app/remote-modules.d.ts` | `declare module 'mro-web/Routes'` para o carregamento federado tipado |

- **Um chrome, dois modos:** o host monta o MFE com o proprio `PortalShell`;
  o `mro-web` sozinho monta `MroShell`, ambos delegando a moldura ao
  `VortexShell`. Nada de layout duplicado.
- **Links cientes do prefixo:** as rotas de dominio sao relativas e todo link
  interno usa `APP_BASE_PATH` (default `''`). O host injeta `/mro`, entao o
  mesmo componente funciona em `/aeronaves` (subdominio) e `/mro/aeronaves`
  (host).
- **Sessao e idempotencia preservadas:** o interceptor de `@vortex/core` (Bearer,
  `Idempotency-Key`, renovacao no `TOKEN_EXPIRED`) e o `authGuard` valem nos dois
  modos; o MFE nao recria login nem cliente HTTP.
- **`publicPath` no dev server:** o helper do Nx fixa `publicPath: 'auto'`, que
  injeta `import.meta.url` no runtime; o dev-server carrega `styles.js` como
  script classico e o bundle quebrava. No `webpack.config.ts` (dev) fixamos a
  raiz quando `WEBPACK_SERVE !== 'false'`; o build dos remotes estaticos roda
  com `WEBPACK_SERVE=false` e mantem `auto`, resolvendo cada chunk pelo
  `remoteEntry.mjs` do subdominio.

### 19.2 Verificação executada

- `nx build mro-web` gera `dist/apps/mro-web/remoteEntry.mjs` com o container
  `mro_web`; `nx build shell-web` gera o host com o override de producao para
  `https://mro.vortex.com` (confirmado no bundle).
- Verificacao no navegador (Playwright, `/tmp/opencode/mf-check.mjs`) contra o
  dev-server do host (porta 4300): login no chrome compartilhado, portal,
  MFE montado em `/mro/conformidade`, `remoteEntry.mjs` carregado de
  `localhost:4301`, rota profunda `/mro/aeronaves`, rodape do ledger e, no modo
  standalone (4301), `/conformidade` + navegacao `/aeronaves`; **sem erros de
  console nem requisicoes falhas**.
- `nx test shell` = **5 testes** novos (chrome e Central); `shell-web` = 1;
  `mro-web` = 3. `nx run-many -t lint` verde nos projetos tocados.

### 19.3 O que NÃO foi feito (lacunas explícitas)

1. **So o MRO e remote**: os outros 7 apps aparecem no portal como "planejado";
   cada um vira remote quando tiver rotas.
2. **Sem versionamento do contrato federado**: nao ha `shared` explicito com
   fallback de versao nem checagem de compatibilidade host↔remote.
3. **Sem empacotamento de deploy do frontend**: faltam Dockerfile/nginx por
   subdominio para `shell-web`/`mro-web` e validacao real de CORS/`deployUrl`.
4. **Central de Comunicacao so no frontend** (fechada na seção 20): ate entao o
   `CommunicationStore` tinha estado local; a API de chat/alertas/e-mails/
   comunicados passou a existir na seção 20.
5. **SSO entre subdominios nao resolvido**: no host a sessao vive no
   `localStorage` do `app.vortex.com`; abrir `mro.vortex.com` direto hoje pede
   login de novo (falta cookie de sessao de dominio ou troca de token).
6. **Sem e2e federado no CI**: a verificacao foi por script Playwright manual,
   nao por um alvo `nx e2e` do host.

---

## 20. Central de Comunicacao (chat, alertas, comunicados e e-mails)

Fecha a lacuna da seção 19.3: a Central de Comunicacao da Shell deixa de ter
estado local e passa a ser uma **janela sobre o backend**. Cada conversa, cada
comunicado oficial e cada e-mail transacional e um registro no banco e ancora um
bloco no ledger; os badges da Shell sao **estado corrente derivado** (contagem),
nunca copia. Marcar como lido e posicionamento de consumo por usuario e, por
isso, o unico ponto em que se abre mao da regra 1 (nao gera bloco).

### 20.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0015_communication_center.sql` (+ `0016_fix_communication_participants_rls.sql`) | Schema `communication` (conversations, conversation_participants, messages, announcements, announcement_reads, mail_messages), RLS por tenant/empresa, triggers de imutabilidade e triggers de ledger diferido |
| Correção RLS | `communication.is_participant()` (SECURITY DEFINER) | Rompe a recursão entre `conversations` e `conversation_participants`: a checagem de participação lê a tabela de participantes sem disparar o RLS |
| Contratos | `libs/shared-dto/src/lib/communication-api.ts` | Formas de `CommunicationSummary`/`Alerts`, `Conversation`, `Message`, `Announcement`, `Mail` e os requests/responses, todos `extends LedgerAnchor` |
| Backend | `apps/ops-mro/src/app/communication/**` | `repository` (SQL nativo), `service` (regras), `controller` (`/api/communication/*`), `mapper` (linha → contrato) e `module`; escritas por `WriteRoute` com ledger na mesma transacao |
| Acesso/estado | `libs/core/src/lib/communication/communication.service.ts` | Cliente HTTP e sinais de estado dos contadores por modulo |
| Chrome | `libs/shell/src/lib/communication-center.ts` | Os 4 modulos da barra (Chat, Alertas, E-mails, Comunicados) hidratados por `summary()`; a Shell so **exibe** |

- **Rotas:** `GET /summary`, `GET/POST /conversations`, `GET/POST
  /conversations/:id/messages`, `POST /conversations/:id/read`, `GET /alerts`,
  `GET/POST /announcements`, `POST /announcements/:id/read`, `GET/POST /mail`,
  `POST /mail/:id/read`.
- **Conversa so para participantes:** a policy de `conversations` exige
  `created_by` ou `is_participant`; mensagens seguem a mesma checagem. Quem nao
  participa nao enxerga a conversa (RLS), nem por `id` direto.
- **Publicar comunicado exige papel:** o insert de `announcements` chama
  `identity.can_administer`; sem papel, `403 PERMISSION_DENIED`.
- **Escritas ancoradas:** conversa, mensagem, comunicado e e-mail gravam o bloco
  na mesma transacao (`ledger_block_id` validado por trigger diferido). As marcas
  de leitura (`last_read_at`, `read_at`, `announcement_reads`) nao geram bloco.
- **Imutabilidade:** `messages` e `announcements` bloqueiam UPDATE/DELETE por
  trigger; `mail_messages` so admite a atualizacao de `read_at`.

### 20.2 Verificação executada

- `nx e2e ops-mro-e2e`: **31 testes verdes** (5 novos: `summary` exige contexto;
  chat com dois usuarios com nao lido/leitura e RLS de fora; idempotencia do
  chat; comunicado com publicacao e `403`; e-mail com ledger e caixa).
- `nx test ops-mro` (mapper) e `nx test shell` (**6 testes** em 2 arquivos, com a
  Central) e `nx test core` (**9 testes**) verdes.
- `nx run-many -t typecheck -p @vortex/shared-dto ops-mro` e `nx run-many -t lint
  -p ops-mro shell core shell-web mro-web` verdes.
- Smoke no servidor real: `GET /api/communication/summary` responde
  `{ chat, alerts, mail, news }` no envelope; o RLS nega a conversa a quem nao
  participa.

### 20.3 O que NÃO foi feito (lacunas explícitas)

1. **Sem WebSocket/push**: a Central e por requisicao (`summary`); nao ha
   socket nem badge ao vivo enquanto a aba esta aberta.
2. **Sem anexos nos e-mails**: o corpo e texto; anexos exigiriam
   document-service/MinIO e presigned URLs.
3. **E-mail nao sai de fato**: `queueMail` grava `QUEUED` no ledger; falta o
   consumidor que envia via Resend e atualiza o status.
4. **Comunicado sem destinatarios**: o escopo e do tenant/empresa inteiro; nao
   ha segmentacao por papel/vinculo nem leitura obrigatoria.
5. **Alerta e leitura do Hub, nao origem**: `/alerts` projeta o estado corrente
   do bus; nao ha marcar-ciente nem silenciar por usuario.

---

## 21. Sessões e senha: revogação por evento e dispositivos

Fecha a lacuna 18.3.2: até aqui uma família de refresh tokens só morria no
`logout` ou no reuso detectado. Trocar a senha — ou perder o vínculo ATIVO —
deixava sessões antigas vivas por até 30 dias. Agora o encerramento é **por
evento**, disparado no banco, e o usuário ganha o controle explícito das
próprias sessões.

### 21.1 Desenho

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0017_session_revocation_by_event.sql` (+ `0018_session_listing.sql`) | `revoked_reason`, `user_agent` e `ip_address` em `identity.refresh_tokens`; `revoke_user_sessions()`, `verify_user_password()`, `list_user_sessions()` e `revoke_user_session()` (`SECURITY DEFINER`); triggers de evento |
| Eventos | `identity.on_password_changed` + `identity.on_membership_revoked` | Trocar a senha revoga **todas** as sessões; perder o vínculo ACTIVE revoga as sessões **daquele tenant** |
| Serviço | `apps/ops-mro/src/app/platform/auth/auth.service.ts` | `changePassword`, `revokeAllSessions`, `listSessions` e `revokeSession`; o login grava o dispositivo |
| Rotas | `auth.controller.ts` + `auth.dto.ts` | `POST /api/auth/password`, `POST /api/auth/sessions/revoke`, `GET /api/auth/sessions` e `POST /api/auth/sessions/:sessionId/revoke` |
| Contratos | `libs/shared-dto/src/lib/auth-api.ts` | `ChangePasswordRequest/Response`, `RevokeSessionsResponse`, `SessionRecord`, `ListSessionsResponse`, `RevokeSessionResponse`; `LoginResponse.sessionId` |
| Cliente | `libs/core/src/lib/auth/auth.service.ts` | `changePassword` / `revokeAllSessions` / `listSessions` / `revokeSession`; `SessionStore` guarda o `sessionId` |
| Chrome | `libs/shell/src/lib/session-panel.ts` | Painel "Sessões": lista os dispositivos, destaca a sessão atual e encerra uma ou todas |

- **Gancho no banco, não na aplicação:** qualquer caminho que grave o hash
  (`set_password` do seed, reset administrativo ou a troca do próprio usuário)
  passa pelo trigger de `identity.credentials` e revoga. Não há como esquecer a
  revogação em um novo fluxo.
- **Escopo correto:** a senha é global ao usuário (revoga em todos os tenants);
  o vínculo é por tenant (revoga só as sessões daquele tenant).
- **Senha atual conferida no banco:** `identity.verify_user_password` compara
  com bcrypt sem trafegar o hash para a aplicação; senha errada responde
  `422 VALIDATION_ERROR` e **não** incrementa o bloqueio de login (política
  separada).
- **Rótulos de revogação:** `PASSWORD_CHANGED`, `MEMBERSHIP_REVOKED`,
  `USER_LOGOUT_ALL`, `REUSE_DETECTED`, `EXPIRED` e `LOGOUT` ficam em
  `revoked_reason`, tornando auditável *por que* cada família caiu.
- **Sem bloco no ledger (desvio consciente):** a revogação é estado de segurança
  da autenticação (como `used_at`/`replaced_by` do refresh e o `logout` da seção
  18); o que é comunicado/negócio é que ancora.

### 21.2 Verificação executada

- `nx e2e ops-mro-e2e`: **34 testes verdes** (3 novos) — `sessions/revoke` exige
  contexto; `logout-all` derruba duas famílias; a troca de senha rejeita a atual
  errada (`422`), revoga a sessão que a fez, invalida a senha antiga e aceita a
  nova.
- Triggers conferidos direto no banco (linhas descartáveis): senha alterada →
  `PASSWORD_CHANGED`; `tenant_users.status` para `REVOKED` → `MEMBERSHIP_REVOKED`
  no tenant correspondente.
- `nx test core`: **12 testes** (3 novos em `auth.service.spec.ts`); `nx test
  shell` (6) e `nx test ops-mro` verdes.
- `nx run-many -t lint` (6 projetos), `nx typecheck @vortex/shared-dto ops-mro`
  e `nx build mro-web shell-web` verdes.

### 21.3 O que NÃO foi feito (lacunas explícitas)

1. ~~**Sem revogação por evento de segurança**: reuso detectado não dispara aviso
   (e-mail/in-app) ao usuário.~~ **Fechada na seção 21.5.**
2. **Sem política de retenção**: tokens revogados/expirados permanecem em
   `identity.refresh_tokens`; falta um job de limpeza.
3. **Sem troca de senha obrigatória no primeiro acesso** nem histórico de senhas.
4. **Sem `kid`/rotação do segredo JWT**: o access token segue HS256 com segredo
   único.

### 21.4 Listagem de sessões ativas (fecha a lacuna 21.3.1)

Cada família de refresh tokens passa a registrar o dispositivo que a abriu — o
`User-Agent` e o IP capturados no login (a rotação mantém a mesma família, então
o dado não se perde). `identity.list_user_sessions` agrega por família e devolve
apenas as **vivas** (com token não revogado e não expirado). O painel "Sessões"
da Shell mostra a lista, marca a sessão atual (comparando o `sessionId` guardado
localmente) e permite encerrar uma sessão isolada.

- **Posse conferida no banco:** `identity.revoke_user_session` filtra por
  `user_id` e `family_id`; conhecer o `family_id` de outro usuário não permite
  revogá-lo (o teste devolve `revoked: 0`).
- **Encerrar a sessão atual** cai para o login, pois a família revogada é a que
  sustenta a renovação da Shell.
- **Sem token no payload:** a listagem nunca devolve `token_hash`; só metadados
  (dispositivo, IP, datas).

**Verificação:** `nx e2e ops-mro-e2e` = **36 testes** (2 novos: listar/marcar e
encerrar apenas uma, incluindo `401` sem contexto e o sucesso do refresh da
sessão restante; e a recusa de encerrar a sessão de outro usuário). `nx test
shell` = **9** (3 novos do `SessionPanel`); `nx test core` = 12. `nx lint`,
`typecheck` e `nx build mro-web shell-web` verdes. No navegador (host 4300):
painel lista 2 sessões com "esta sessão" marcada, o encerramento remoto mantém a
sessão atual, e "encerrar todas" redireciona ao login limpando o `localStorage`
— sem erros de console.

### 21.5 Aviso ao usuário no reuso detectado (fecha a lacuna 21.3.1)

Detectar o reuso só tem valor se o dono da sessão souber. O reuso já revogava a
família no banco (`REUSE_DETECTED`, seção 21); agora ele também **avisa o
usuário** por dois canais: notificação in-app e e-mail transacional. O aviso é
disparado em `AuthService.refresh`, reaproveitando `rotate_refresh_token` (que
devolve `user_id`/`tenant_id`/`family_id` do token reapresentado) e registrando
o dispositivo/IP da tentativa suspeita.

| Peça | Arquivo | Papel |
|------|---------|-------|
| Migração | `migrations/0019_user_notifications.sql` | `notifications.user_notifications` (aviso direto ao usuário), RLS por `user_id` + triggers de imutabilidade |
| Serviço | `apps/ops-mro/src/app/platform/notifications/notifications.service.ts` | `notifyRefreshTokenReuse`: avatar in-app + `queueMail` ao e-mail do dono; **best-effort** (falha do aviso não mascara o `401`) |
| Persistência | `notifications.repository.ts` | `create` ancora bloco no ledger na mesma transação; `list`/`markRead` (estado de consumo, sem bloco) |
| Rotas | `notifications.controller.ts` + `auth.controller.ts` | `GET /api/notifications`, `POST /api/notifications/:id/read`; o `refresh` passa o `User-Agent`/IP |
| Contratos | `libs/shared-dto/src/lib/notification-api.ts` | `UserNotificationRecord`, `ListNotificationsResponse`, `NotificationReadResponse`; `CommunicationCounters.notices` |
| Cliente/Chrome | `libs/core/.../notification.service.ts` + `libs/shell/.../communication-center.ts` | 5º módulo **Notificações** da Central; novo contador `notices` no `summary()` |

- **Aviso direto, não comunicado:** a notificação é por `user_id` (só o dono vê);
  um comunicado de tenant vazaria o evento para toda a empresa.
- **Duplo canal:** o in-app fica na Central (histórico consultável) e o e-mail
  chega mesmo que o usuário não esteja no app — o cenário típico de um token
  roubado reapresentado.
- **Best-effort por desenho:** o aviso nunca transforma um `401 AUTH_REQUIRED`
  em `500`; a revogação (o efeito de segurança) é o que importa. Se o vínculo do
  usuário já caiu (reuso por perda de vínculo), o insert do aviso é recusado pelo
  RLS e apenas registrado em log.

**Verificação:** `nx e2e ops-mro-e2e` = **38 testes** (2 novos: o reuso gera
aviso in-app `SESSION_REUSE_DETECTED` + e-mail ao dono, outro usuário não vê o
aviso e marcar como lido zera; e `GET /api/notifications` sem contexto = `401`).
`nx test shell` = **10** (1 novo do módulo Notificações); `nx test core` = 12;
`nx build ops-mro` e `typecheck` verdes. Conferido por HTTP: `summary` devolve
`notices` e a lista traz o aviso com severidade `CRITICAL`.

---

*Nota final 10: as seções 19 a 21 fecharam o shell federado (com o `mro-web` como primeiro MFE e o chrome em `@vortex/shell`), a API da Central de Comunicacao (chat, alertas, comunicados e e-mails ancorados no ledger), a revogacao de sessoes por evento (troca de senha, perda de vinculo e logout-all), a listagem de sessoes ativas por dispositivo e o aviso (in-app + e-mail) ao usuario no reuso de refresh token detectado. Permanecem abertas, por decisão de escopo: SSO entre subdominios, empacotamento de deploy do frontend, os demais MFEs, WebSocket/push da Central, o envio real de e-mails (o aviso apenas enfileira o transacional), profundidade das filas do RabbitMQ e 2FA/RBAC fino.*
