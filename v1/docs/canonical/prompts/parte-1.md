# VORTEX — PARTE 1/8: FUNDAÇÃO, SHELL UNIFICADA, DESIGN SYSTEM E NÚCLEO DE IDENTIDADE (MDM)

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em arquitetura enterprise, multi-tenancy, identidade federada (OIDC), design systems e aviação civil regulada. Construa a FUNDAÇÃO do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 1

Estabelecer a fundação do ecossistema VORTEX:
1. **Monorepo Turborepo** com a estrutura do CLAUDE.md.
2. **Shell Unificada** (micro-frontends federados) que orquestra os 8 aplicativos.
3. **Design System** (`@vortex/ui-core`) com tokens, componentes e temas versionados.
4. **Núcleo de Identidade (MDM)** — Pessoa + Vínculo + Papel, com licenças (RBAC 61/63/65) e credenciamento (RBAC 183) como FONTE ÚNICA.
5. **Contrato global** (10 regras imutáveis), padrão de resposta, segurança e observabilidade.

## 2. STACK E ARQUITETURA (IMUTÁVEL — do CLAUDE.md)

- Backend: NestJS (TypeScript), monorepo Turborepo.
- Banco: PostgreSQL 16 com Row-Level Security (RLS). Nunca MongoDB.
- Cache/sessão: Redis. Fila: RabbitMQ. Arquivos: MinIO (presigned URLs).
- Frontend: React 19, Vite, Module Federation, Tailwind, shadcn/ui.
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

## 7. SHELL UNIFICADA (MICRO-FRONTENDS FEDERADOS)

### 7.1 Conceito
- A Shell é o host de Module Federation que orquestra os 8 aplicativos (remotes federados).
- Cada app tem seu próprio código e arquivos (isolamento), mas consome o mesmo Design System (`@vortex/ui-core`) e os mesmos contratos (`@vortex/contracts-fe`).
- Falha em um app não derruba os outros (isolamento por remote).

### 7.2 Os 8 aplicativos
1. RCONTA → Identidade (MDM), Protocolo, Assinatura, Billing
2. CATÁLOGO CENTRAL → Produtos, Peças, ATA, Glossário, Formulários
3. RLOJA → Marketplace B2B
4. RECRUTAMENTO → Capital humano técnico, licenças, horas de voo
5. ERP 43+145 → Manutenção aeronáutica
6. ERP 91/121/135/137 → Operadores aéreos e aeroagrícola
7. ERP 141/142 → Instrução e treinamento
8. ERP 153 → Aeródromos e infraestrutura

### 7.3 Navegação federada
- Contratos de navegação em `@vortex/contracts-fe` (tipos de rotas, navegação por subdomínio).
- Shell define: sidebar, top bar (com sino de notificações e badges de alertas), header, footer.
- Cada app registra suas rotas e menus via contrato.

### 7.4 Isolamento e reaproveitamento
- ISOLAMENTO: cada app é um remote federado com código, banco (via RLS) e API próprios.
- REAPROVEITAMENTO: todos consomem `@vortex/ui-core` (Design System), `@vortex/contracts-fe` (contratos) e a API central.
- SEPARAÇÃO DE RESPONSABILIDADES: Shell = navegação e orquestração; Apps = funcionalidade de domínio; Backend = regras de negócio e dados; Ledger = integridade.

## 8. DESIGN SYSTEM (@vortex/ui-core)

### 8.1 Tokens de design
- Cores: primária (azul aviação `#0B3D91`), neutras, semânticas (sucesso/erro/aviso/info).
- Tipografia: escala tipográfica (display, título, corpo, caption).
- Espaçamento: escala de 4px (4, 8, 12, 16, 24, 32, 48, 64).
- Raio: 4, 8, 12, 16.
- Sombras: elevadas (sm, md, lg, xl).
- Tokens em CSS variables + objetos TypeScript (single source of truth).

### 8.2 Componentes base
- Button, Input, Select, Checkbox, Radio, Switch, Textarea, Badge, Card, Table, Modal, Drawer, Tabs, Accordion, Tooltip, Toast, Avatar, Skeleton, Pagination, EmptyState, Spinner.

### 8.3 Temas versionados
- Tema claro e escuro.
- White-label: logomarca e cores da organização (para clientes Enterprise).

### 8.4 Logomarca VORTEX
- SVG otimizado (caminho vetorial, sem fontes externas, cores em tokens).
- Variantes: cor principal, monocromática, branca (fundo escuro).
- Tamanhos: 16/24/32/48/64px (escaláveis sem perda).

## 9. NÚCLEO DE IDENTIDADE (MDM) — VERGALHÃO DE IDENTIDADE

### 9.1 Modelo Pessoa + Vínculo + Papel
- Pessoa (usuário) é global e única.
- Vínculo liga pessoa a empresa com um papel.
- Papel define permissões (RBAC + ABAC).

### 9.2 Entidades
```sql
-- SCHEMA: identity
CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(11) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    social_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    canac VARCHAR(10) UNIQUE, -- Código ANAC do profissional
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    corporate_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    certificate_type VARCHAR(50) NOT NULL, -- COA_121, COA_135, OM_145, CIAC_141, CTAC_142, CDAG_137
    certificate_number VARCHAR(100),
    certificate_validity TIMESTAMPTZ,
    operational_status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','LEGAL','PROCURADOR','FUNCIONARIO','SOCIETARIO')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
    starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.3 MDM de Pessoas (perfil profissional canônico)
```sql
CREATE TABLE identity.professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES identity.users(id),
    professional_type VARCHAR(50) NOT NULL CHECK (professional_type IN
      ('PILOTO','COMISSARIO','MECANICO_VOO','MMA','DOV','INSTRUTOR','EXAMINADOR','OUTRO')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','INACTIVE')),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES identity.professional_profiles(id),
    license_type VARCHAR(50) NOT NULL, -- PP, PC, PLA, MMA, COMISSARIO, MEC_VOO, DOV
    license_number VARCHAR(50) NOT NULL, -- CANAC
    habilitacoes JSONB NOT NULL DEFAULT '[]', -- IFRA, MLTE, MNTE, IFRH, CELULA, GMP, AVIONICOS
    issue_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED','REVOKED')),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.accreditations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    accreditation_type VARCHAR(50) NOT NULL CHECK (accreditation_type IN ('PCP','PCF','PCA','EXAMINADOR_MMA')),
    portaria_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    scope JSONB NOT NULL DEFAULT '[]', -- Grupos A/B/C
    valid_until DATE NOT NULL, -- 3 anos regulamentares (ID 479)
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED','REVOKED')),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.4 Regras de negócio do MDM
- Licença é FONTE ÚNICA — nenhum app cria licença própria.
- Credenciamento expirado (3 anos) → bloqueio automático + alerta 60 dias antes (RBAC 183).
- Licença/CMA/credenciamento vencido → bloqueio de prerrogativas (RBAC/ABAC).
- Sincronização via event bus: núcleo publica `PROFILE_UPDATED`; apps consomem (espelho reativo).

## 10. PERMISSÕES: RBAC + ABAC + RLS

### 10.1 Papéis (RBAC)
- ADMIN, LEGAL, PROCURADOR, FUNCIONARIO, USER.
- Posições funcionais (enum extensível): PILOTO, CONTROLADOR_TECNICO, MECANICO, AUXILIAR, APOIO_SOLO, GERENTE_RESPONSAVEL, GERENTE_QUALIDADE, GESTOR_SGSO, DIRETOR_MANUTENCAO, DIRETOR_OPERACAO, ADMINISTRATIVO, INSTRUTOR, EXAMINADOR.

### 10.2 ABAC
- access_level, tipo da entidade, vínculo ativo, procuração vigente, plano.

### 10.3 RLS
- Políticas que combinam tenant_id (via tenant_users) E company_id (via relationships).
- Funções SQL: `current_tenant_ids()`, `current_company_ids()`.
- Usuário sem tenant/empresa = não vê NADA (403).

## 11. SEGURANÇA (OBRIGATÓRIO)

- JWT obrigatório; RBAC + ABAC no middleware; RLS no PostgreSQL.
- Secrets via env/secret manager; nunca commitar `.env` (GitGuardian).
- Rate limit (Redis): auth 10/min, leitura 300/min, escrita 60/min, upload 20/min.
- Queries parametrizadas; validação de inputs (422); restringir uploads (tipo/tamanho/hash).
- Security headers; forçar HTTPS; scan de dependências.

## 12. OBSERVABILIDADE

- Pino + Prometheus + OpenTelemetry.
- `GET /health` em cada serviço → `{ success: true, data: { status: "ok" } }`.

## 13. TESTES OBRIGATÓRIOS DA PARTE 1

1. Teste de RLS: usuário sem vínculo recebe 403 e não vê dados.
2. Teste de idempotency: retry não duplica.
3. Teste de padrão de resposta: 100% das rotas no formato `{ success, data, error }`.
4. Teste de isolamento de apps: falha em um remote não derruba a Shell.
5. Teste de MDM: uma pessoa = um perfil; licença única (sem duplicação).
6. Teste de credenciamento: expirado bloqueia; alerta 60 dias.
7. Teste de tokens de design: consistência visual entre apps.

## 14. CRITÉRIOS DE ACEITE DA PARTE 1

- [ ] Monorepo Turborepo com a estrutura do CLAUDE.md.
- [ ] docker-compose sobe tudo; /health verde.
- [ ] Schemas PostgreSQL criados (identity, ledger, protocol, documents, catalog, subscriptions, oauth, signatures, compliance, notifications).
- [ ] Shell com Module Federation orquestrando os 8 apps.
- [ ] Design System `@vortex/ui-core` com tokens e componentes.
- [ ] Núcleo de Identidade (MDM) com Pessoa + Vínculo + Papel.
- [ ] Licenças e credenciamentos como FONTE ÚNICA.
- [ ] RLS habilitado e forçado.
- [ ] Padrão de resposta global implementado.
- [ ] Testes de aceite passando; lacunas listadas.