# VORTEX — PARTE 1/10 (v2): FUNDAÇÃO NX, SHELL ANGULAR, DESIGN SYSTEM, NÚCLEO E RCONTA

> **Versão 2 — 12/09/2026.** Reformulada: monorepo **Nx** (não Turborepo), frontend **Angular moderno** (não React), **Núcleo separado da Rconta** (todos os apps inserem/consomem), Recrutamento com 2 origens e **sem comissão**, estoque bidirecional.
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em arquitetura enterprise, multi-tenancy, identidade federada (OIDC), dados cadastrais com validação automática, design systems Angular e aviação civil regulada. Construa a FUNDAÇÃO do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 1

Estabelecer a fundação do ecossistema VORTEX:
1. **Workspace Nx** com frontend (SPA única Angular) e backend (NestJS) no mesmo repositório, com `libs/shared-dto` como fonte única de contratos.
2. **Shell Angular** (SPA única, lazy loading por feature-lib, Opção A do contrato — seção 7) orquestrando os 13 apps, com caminho de migração A→B→C garantido pelo esqueleto.
3. **Design System** (`libs/ui` — Angular Material + tokens + ValidationBadge + LedgerTimeline).
4. **Núcleo** — Cadastro Central (Pessoas, Profissionais, Empresas, Estoque, Catálogo, Documentos) + Ledger + Banco Central: o único dono de cadastros; **todos os apps inserem e consomem via API**.
5. **Rconta** — app do usuário (7 módulos + 2 menus) que **consome o Núcleo**; os mesmos dados são acessíveis pelos demais apps autorizados.
6. **Validação em níveis N0–N3** (nunca bloqueia fluxo).
7. **Estoque e custódia** (pessoal, empresarial, bidirecional RLoja ↔ ERP).
8. **Recrutamento** — 2 origens de vagas, perfil profissional editável, **sem comissão**.
9. **Contrato global** (10 regras imutáveis), padrão de resposta, segurança e observabilidade.

## 2. PRINCÍPIO ARQUITETURAL CENTRAL (IMUTÁVEL)

> **O NÚCLEO é o DONO DA VERDADE — serviço próprio, separado da Rconta. TODOS os apps, sem exceção (Rconta, ERPs, RLoja, Recrutamento, Travel, Fretamento, App ANAC, Certificações e Publicações e futuros), são CONSUMIDORES: inserem no núcleo via API e consomem dele. Nenhum app cria cadastro próprio de pessoa, produto, vaga ou currículo.**

- O mesmo dado pode ser criado/editado por **qualquer app autorizado** (ex.: currículo pela Rconta OU pelo Recrutamento; endereço pela Rconta, RLoja OU Recrutamento). O que muda é apenas o campo **`origin_app`** no evento do ledger; o cadastro vive **uma única vez** no núcleo.
- O histórico de tudo é o **Ledger** — linha do tempo com conteúdo completo (quem/papel, início, fim, o quê, app de origem), cifrado em repouso (Parte 2). Apps exibem **filtros projetados do ledger** — nunca histórico duplicado.
- Quando uma contratação é finalizada, o sistema **cria automaticamente o vínculo** entre a pessoa contratada e o RH do ERP correspondente (sem cobrança — Recrutamento sem comissão).

## 3. STACK E ARQUITETURA (IMUTÁVEL — do CLAUDE.md v2)

- **Monorepo:** Nx (frontend + backend no mesmo workspace). CI com `nx affected`.
- **Backend:** NestJS (TypeScript estrito), PostgreSQL 16 com RLS, TypeORM + SQL nativo (policies, triggers, PL/pgSQL). **Sem Prisma, sem CQRS, sem TimescaleDB.**
- **Infra:** Redis (cache/sessão/rate-limit), RabbitMQ (eventos), MinIO (arquivos), WebSockets (tempo real).
- **Frontend:** Angular 19+ — standalone components, **signals**, **`inject()`** (nunca construtor em código novo), **`@if`/`@for`/`@switch`** (nunca `*ngIf`/`*ngFor` em código novo), `input()`/`output()`, `ChangeDetectionStrategy.OnPush` em todos os componentes, formulários reativos **tipados**.
- **UI:** Angular Material + Design System próprio (`libs/ui`).
- **Estado:** signals para componente; NgRx ComponentStore apenas para estado complexo local de feature-lib. Sem NgRx global.
- **Backend único:** `api.vortex.com`. **SPA única** com subdomínios resolvendo a rota inicial.
- **Multi-tenant:** lógico (RLS por linha). Tenant é CONTEXTO, nunca dono do dado. **RLoja é multi-vendor** — vender não exige tenant nem assinatura.

## 4. AS 10 REGRAS IMUTÁVEIS (CONTRATO GLOBAL)

1. Toda escrita: valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus.
2. Ledger é IMUTÁVEL (append-only): nunca UPDATE/DELETE. Mudança = novo evento.
3. Tenant é contexto; todo dado operacional tem `user_id`, `company_id`, `tenant_id`.
4. Permissão: RBAC + ABAC no middleware. Frontend NUNCA valida regra de negócio (guards/hides são UX).
5. Padrão de resposta global: `{ success, data, error }`. Erros com `code` padronizado.
6. Rotas de escrita exigem `Idempotency-Key` (Redis, 24h).
7. Não use banco por cliente, não use schema por cliente, não crie serviço fora do monorepo.
8. Responda com código pronto para rodar, com migrations SQL e testes mínimos de aceite.
9. Secrets NUNCA em claro: use variáveis de ambiente / secret manager. Nunca commite `.env`.
10. Antes de cada entrega, liste o que fez e o que NÃO fez (nunca silencie lacunas).

Erros padrão: `AUTH_REQUIRED`(401), `TOKEN_EXPIRED`(401), `PERMISSION_DENIED`(403), `NOT_FOUND`(404), `VALIDATION_ERROR`(422), `RATE_LIMITED`(429), `IDEMPOTENCY_CONFLICT`(409), `LEDGER_VERIFICATION_FAILED`(500).

## 5. ESTRUTURA DO WORKSPACE NX

```
/apps
  vortex-web             # SPA única Angular (host; rotas por subdomínio)
  api-gateway            # gateway, rate limit, idempotência
  auth-service           # login, refresh, 2FA, sessões
  ledger-service         # ledger imutável (conteúdo cifrado — Parte 2)
  protocol-service       # protocolo AAAA-NNNNNN
  document-service       # documentos, versões, hash, MinIO
  catalog-service        # catálogo central (serviço do Núcleo)
  subscription-service   # billing, assinaturas, comissões
  identity-service       # NÚCLEO: pessoas, empresas, vínculos, contatos, endereços
  professional-service   # NÚCLEO: currículo, CIV, CMA, certificados, declarações
  stock-service          # NÚCLEO: estoques + custódia
  recruitment-service    # Recrutamento (2 origens de vagas, candidaturas)
  rloja-service          # marketplace por comissão
  communication-service  # Central de Comunicação + WebSockets
  notification-service   # e-mail + in-app + alertas
  ops-mro                # ERP Manutenção 43/145
  ops-operators          # ERP Operadores 91/121/135
  ops-training           # ERP Cursos 141/142 + ISs
  ops-agri               # ERP Agrícola 137
  ops-airport            # ERP Aeródromos 153
  anac-app-service       # App ANAC (auditor; somente-leitura)
  travel-service         # Travel (passagens 121)
  charter-service        # Fretamento (135/137)
  certpub-service        # Certificações e Publicações
/libs
  shared-dto             # contratos TS únicos (front + back), enums, seeds, validações
  ui                     # Design System (Material + ValidationBadge + LedgerTimeline + temas)
  core                   # auth, permissões, ledger-view, comunicação, interceptors (Angular)
  feature-nucleo         # console de gestão do Núcleo (admins; zero-trust)
  feature-rconta         # Rconta (7 módulos + 2 menus)
  feature-rloja          # RLoja
  feature-recrutamento   # Recrutamento
  feature-mro            # ERP Manutenção
  feature-ops            # ERP Operadores
  feature-training       # ERP Cursos
  feature-agri           # ERP Agrícola
  feature-airport        # ERP Aeródromos
  feature-anac           # App ANAC
  feature-travel         # Travel
  feature-charter        # Fretamento
  feature-certpub        # Certificações e Publicações
  util-*                 # helpers (datas regulatórias, moeda, unidades RBAC 01)
/tools, /migrations, /seeds
```

**Regras de module boundaries (ESLint `@nx/enforce-module-boundaries` — obrigatórias desde o dia 1):**
1. `feature-*` NÃO se importam entre si (garante o desmembramento A→B→C sem reescrever telas).
2. `feature-*` só importam `shared-dto`, `ui`, `core` e `util-*`.
3. Comunicação entre apps só via `libs/core` (serviços de sessão/permissões) — nunca via import direto.
4. Rotas raiz: `app.routes.ts` do shell apenas referencia `loadChildren` de cada feature-lib.

Schemas PostgreSQL: `identity` · `professional` · `stock` · `recruitment` · `market` · `communication` · `accounting` · `mro` · `ops` · `training` · `agri` · `airport` · `ledger` · `protocol` · `documents` · `signatures` · `catalog` · `subscriptions` · `oauth` · `compliance` · `notifications` · `travel` · `charter` · `anac` · `certpub`.

## 6. SHELL ANGULAR (SPA ÚNICA — OPÇÃO A)

### 6.1 Conceito
- Um único app Angular (`vortex-web`) com 13 feature-libs carregadas por **lazy loading de rotas**.
- Subdomínios (`rconta.vortex.com`, `mro.vortex.com`, …) apontam para o mesmo bundle; o host resolve a rota inicial pelo subdomínio (APP_INITIALIZER lê `window.location.hostname` → rota base do app).
- Falha de carregamento de uma feature-lib exibe tela de erro isolada — não derruba a Shell.

### 6.2 Estrutura global da Shell
- **Top bar:** logo (white-label Enterprise) · seletor de apps (13, filtrado por permissão) · **Central de Comunicação** (Chat `[WebSocket]` · Alertas `[badges]` · E-mails · Comunicados) · **Tema** (claro → escuro → personalizado, alterna a cada clique) · perfil/sessão.
- **Sidebar:** menus do app ativo, gerados por permissão (UX).
- **Padrão de detalhe:** abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.

### 6.3 Contrato de navegação
- Cada feature-lib exporta sua `ROUTES` tipada (a partir de `shared-dto`).
- Guards de permissão (UX) + validação no backend (verdade).

## 7. DESIGN SYSTEM (`libs/ui` — sobre Angular Material)

### 7.1 Tokens
- Cores: primária (azul aviação `#0B3D91`), neutras, semânticas (sucesso/erro/aviso/info).
- Tipografia, espaçamento 4px, raios (4/8/12/16), sombras — CSS variables + objetos TS (single source of truth).

### 7.2 Componentes base
Button, Input, Select, Checkbox, Radio, Switch, Textarea, Badge, Card, Table (Material), Modal (Dialog), Drawer, Tabs, Accordion, Tooltip, Toast, Avatar, Skeleton, Pagination, EmptyState, Spinner — todos standalone + signals + OnPush.

### 7.3 Componentes próprios VORTEX
- **ValidationBadge** — exibe o nível de validação: ⚪ N0 Pendente · 🟡 N1 Sistema · 🟢 N2 Oficial · 🔵 N3 Autêntico. Input: `level: 'N0'|'N1'|'N2'|'N3'`, `source?: string`.
- **LedgerTimeline** — linha do tempo imutável de uma entidade (filtro do ledger); somente-leitura; exibe quem/papel, início, fim, app de origem.
- **SeletorDeTema** — claro → escuro → personalizado (alterna a cada clique).
- **BannerAd** — exibido apenas para Rconta grátis (condição lida da assinatura no núcleo).

### 7.4 Temas
Claro, escuro e personalizado (tamanho do texto, fonte, cor de fundo — módulo Personalização). White-label (logo/cores) para Enterprise.

## 8. NÚCLEO — CADASTRO CENTRAL (schemas `identity`, `professional`, `stock`, `catalog`)

### 8.1 Entidades base
```sql
-- SCHEMA: identity
CREATE TABLE identity.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(11) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    social_name VARCHAR(255),
    birth_date DATE,
    gender VARCHAR(20),
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
    certificate_type VARCHAR(50) NOT NULL, -- OM_145, COA_121, COA_135, CDAG_137, CIAC_141, CTAC_142, AERODROMO_153
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
    ledger_block_id UUID, -- referencia ledger.ledger_blocks (Parte 2)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8.2 Regra multi-app de escrita (v2)
1. Toda tabela do núcleo aceita escrita de **qualquer app autorizado** via API do núcleo — a autorização é por permissão (RBAC/ABAC), não por app.
2. Toda escrita registra **`origin_app`** no evento do ledger (RCONTA, RECRUTAMENTO, RLOJA, ERP_*, TRAVEL, CHARTER, CERTPUB, ANAC, NUCLEO).
3. Nenhum app mantém tabela própria de pessoas/produtos/vagas/currículos — a verificação é critério de aceite desta parte.

## 9. RCONTA — 7 MÓDULOS + 2 MENUS (consome o núcleo)

| Estrutura | Conteúdo |
|-----------|----------|
| **Módulo Pessoal** | Dados pessoais (endereços, e-mails, telefones), documentos pessoais (CPF, RG, Título, Passaporte, outros), redes sociais pessoais |
| **Módulo Profissional** | Dados profissionais, documentos profissionais (CANAC, licenças CHT, CREA, habilitações, CNH), currículo (cursos, treinamentos, experiências, CMA, CIV), **declarações de experiência**, **estoque pessoal** |
| **Módulo Empresarial** | Responsáveis legais, procuradores, empresas vinculadas (com documento digital assinado), **1 estoque por empresa**, **[timeline da assinatura]** |
| **Módulo Protocolo** | Protocolo eletrônico AAAA-NNNNNN |
| **Módulo Assinaturas** | Rconta VIP · Assinatura de Vagas · 5 ERPs · Publicações — detalhes e cancelamento |
| **Módulo Personalização** | Tamanho do texto, fonte, cor de fundo; tema claro → escuro → personalizado |
| **Módulo Segurança** | Senha, dispositivos, 2FA |
| **Menu Dashboard** | Widgets de cada módulo |
| **Menu Configurações** | Idioma, horário UTC, demais preferências |

## 10. MÓDULO PESSOAL (dados cadastrais — residem no NÚCLEO)

### 10.1 Entidades
```sql
-- SCHEMA: identity
CREATE TABLE identity.person_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('EMAIL','TELEFONE','CELULAR','WHATSAPP','OUTRO')),
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100), -- SISTEMA, GOV, RECEITA, CORREIOS, MANUAL
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contact_type, value)
);

CREATE TABLE identity.person_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    address_type VARCHAR(50) NOT NULL CHECK (address_type IN ('RESIDENCIAL','COMERCIAL','COBRANCA','ENTREGA')),
    zip_code VARCHAR(8) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100),
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.person_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN
      ('RG','CNH','PASSAPORTE','CPF','TITULO_ELEITOR','COMPROVANTE_RESIDENCIA','CERTIDAO_NASCIMENTO','CERTIDAO_CASAMENTO','OUTRO')),
    document_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(100),
    issuing_state VARCHAR(2),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','VALIDADO','REJEITADO')),
    validation_source VARCHAR(100),
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.person_social_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    network_type VARCHAR(50) NOT NULL CHECK (network_type IN ('LINKEDIN','INSTAGRAM','FACEBOOK','X','YOUTUBE','OUTRO')),
    profile_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, network_type)
);
```

### 10.2 Regras do módulo pessoal
1. Múltiplos contatos, endereços, documentos e redes sociais por pessoa — sem duplicação.
2. Um contato/endereço marcado como **principal** por tipo.
3. Toda validação/criação gera bloco no ledger (com `origin_app`).
4. Dados pessoais exibidos com **ValidationBadge** conforme o nível.
5. **Editável pela Rconta, RLoja (dados de compra) e Recrutamento (perfil)** — mesmo cadastro no núcleo.

## 11. MÓDULO PROFISSIONAL (currículo, CIV, CMA, declarações, estoque pessoal — residem no NÚCLEO)

### 11.1 Entidades
```sql
-- SCHEMA: professional
CREATE TABLE professional.professional_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('EMAIL','TELEFONE','CELULAR','OUTRO')),
    value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.professional_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN
      ('CANAC','LICENCA_CHT','HABILITACAO','CREA','CNH','CIV','OUTRO')),
    document_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(100),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.professional_social_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    network_type VARCHAR(50) NOT NULL,
    profile_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    course_type VARCHAR(50) NOT NULL, -- PP, PC, PLA, IFR, COMISSARIO, MMA, DOV, INSTRUTOR, EXAMINADOR
    course_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    institution_certificate VARCHAR(100),
    start_date DATE,
    end_date DATE,
    workload_hours NUMERIC(10,2),
    certificate_file_hash VARCHAR(64),
    certificate_storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (validation_status IN ('PENDENTE','SISTEMA','OFICIAL','AUTENTICO')),
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    training_type VARCHAR(50) NOT NULL, -- TREINAMENTO_PERIODICO, RECORRENCIA, FATORES_HUMANOS, UPRT, ETOPS, PTO, LOFT
    training_name VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    start_date DATE,
    end_date DATE,
    validity_date DATE,
    certificate_file_hash VARCHAR(64),
    certificate_storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    certificate_type VARCHAR(50) NOT NULL, -- LICENCA, HABILITACAO, CMA, CREDENCIAMENTO, CERTIFICADO_CURSO
    certificate_name VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.2 CIV — Caderneta Individual de Voo (RBAC 61 / IS 61-001G)
```sql
CREATE TABLE professional.flight_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id), -- piloto dono do registro
    entry_type VARCHAR(20) NOT NULL, -- flight, ground_run, simulador
    entry_date DATE NOT NULL,
    departure_aerodrome VARCHAR(10),
    arrival_aerodrome VARCHAR(10),
    takeoff_time TIMESTAMPTZ,
    landing_time TIMESTAMPTZ,
    flight_time_hours DECIMAL(15,2) NOT NULL,
    pousos INTEGER DEFAULT 1 NOT NULL,
    diurno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    noturno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    navegacao DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    instrumento DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    capota DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    simulador DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    milhas_navegacao DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    aircraft_registration VARCHAR(10),
    aircraft_model VARCHAR(50),
    habilitacao VARCHAR(10) NOT NULL, -- IFRA, MLTE, MNTE, IFRH
    funcao VARCHAR(10) NOT NULL, -- PIC, SIC, INSTR, INSP
    instructor_user_id UUID REFERENCES identity.users(id),
    tpx BOOLEAN DEFAULT FALSE NOT NULL,
    experimental BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','rectified','voided')),
    signature_timestamp TIMESTAMPTZ,
    signature_identity VARCHAR(255),
    signature_verified BOOLEAN DEFAULT FALSE NOT NULL,
    attestation_text TEXT,
    endossado BOOLEAN DEFAULT FALSE NOT NULL,
    endossado_por UUID,
    endossado_em TIMESTAMPTZ,
    civ_sent_anac BOOLEAN DEFAULT FALSE NOT NULL,
    civ_sent_anac_at TIMESTAMPTZ,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    content_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.3 CMA — Certificado Médico Aeronáutico (RBAC 67)
```sql
CREATE TABLE professional.medical_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    cma_class VARCHAR(20) NOT NULL CHECK (cma_class IN ('CLASSE_1','CLASSE_2','CLASSE_3')),
    cma_number VARCHAR(100),
    issuing_date DATE NOT NULL,
    validity_end DATE NOT NULL,
    restriction_code VARCHAR(255),
    file_hash VARCHAR(64),
    storage_key VARCHAR(512),
    status VARCHAR(50) NOT NULL DEFAULT 'VALIDO'
      CHECK (status IN ('VALIDO','VENCIDO','SUSPENSO','CASSADO')),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    validated_by UUID,
    validated_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
> Integração SACI (ANAC) quando disponível eleva a validação do CMA para **N2 (selo oficial 🟢)**. Nunca bloqueia o cadastro.

### 11.4 Vínculos de experiência profissional (pessoa ↔ empresa) — dupla confirmação mista
```sql
CREATE TABLE professional.work_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    role VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    initiated_by VARCHAR(20) NOT NULL CHECK (initiated_by IN ('PESSOA','EMPRESA')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE_PESSOA'
      CHECK (status IN ('PENDENTE_PESSOA','PENDENTE_EMPRESA','ATIVO','REJEITADO','ENCERRADO')),
    confirmed_by_person BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_person_at TIMESTAMPTZ,
    confirmed_by_company BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_company_at TIMESTAMPTZ,
    confirmed_by_company_user UUID,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.5 Declarações automáticas de experiência (v2)
```sql
CREATE TABLE professional.experience_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_experience_id UUID NOT NULL REFERENCES professional.work_experiences(id),
    requested_by UUID NOT NULL REFERENCES identity.users(id),
    request_origin VARCHAR(20) NOT NULL CHECK (request_origin IN ('FUNCIONARIO','DESLIGAMENTO_EMPRESA')),
    statement_document_id UUID, -- documento estruturado assinado (Parte 3)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
> Regra: é **direito do trabalhador** ter a declaração de que exerceu o cargo/função pelo período X — a pedido dele ou quando a empresa encerra o vínculo. Documento estruturado, assinado, gerado do histórico de vínculo do núcleo e ancorado no ledger. Solicitável pela Rconta **ou** pelo Recrutamento.

### 11.6 Regras do módulo profissional
1. Curso/treinamento/certificado/vínculo/CIV/CMA/declaração são criados **no núcleo** — nenhum app cria cadastro próprio.
2. **Editável pela Rconta E pelo Recrutamento** (perfil profissional completo) — origem no ledger.
3. Certificado anexado gera hash SHA-256 e é armazenado no MinIO.
4. Validação em níveis N0–N3; nada é bloqueado por falta de validação.
5. Lançamento na CIV exige **assinatura do piloto**; voo de instrução exige **endosso do instrutor**; correção gera `rectified`; cancelamento gera `voided`.
6. O evento `FLIGHT_CLOSED` do ERP pode **pré-preencher rascunho** na CIV — só vira registro assinado após confirmação do piloto.
7. Toda criação/validação/rejeição gera bloco no ledger.

## 12. MÓDULO EMPRESARIAL (responsáveis, procuradores, empresas, estoque)

### 12.1 Entidades
```sql
-- SCHEMA: identity
CREATE TABLE identity.company_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    binding_type VARCHAR(50) NOT NULL
      CHECK (binding_type IN ('RESPONSAVEL_LEGAL','PROCURADOR','FUNCIONARIO')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','APPROVED','REJECTED','REVOKED')),
    initiated_by VARCHAR(20) NOT NULL CHECK (initiated_by IN ('PESSOA','EMPRESA')),
    confirmed_by_person BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_person_at TIMESTAMPTZ,
    confirmed_by_company BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_company_at TIMESTAMPTZ,
    confirmed_by_company_user UUID,
    binding_document_id UUID, -- documents.documents (Parte 3)
    binding_signature_id UUID, -- signatures.signatures (Parte 3)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 12.2 Regras do módulo empresarial
1. Lista as empresas em que a pessoa tem **responsabilidade legal**, **procuração** ou **vínculo de funcionário**.
2. **Documento digital assinado** para cada responsabilidade/procuração aprovada.
3. Ao clicar na empresa: cadastro completo + **[timeline da assinatura]** (histórico desde a compra; congelado e legível por 5 anos após encerramento).
4. **1 estoque por empresa** (ver seção 14).
5. Aprovação de vínculo: **dupla confirmação**; pendente é exibido sem selo.

## 13. MÓDULOS PROTOCOLO, ASSINATURAS, PERSONALIZAÇÃO, SEGURANÇA + MENUS

### 13.1 Protocolo
Sem alteração: `AAAA-NNNNNN` (Resolução 520/2019) — detalhes na Parte 2.

### 13.2 Assinaturas
- Lista: **Rconta VIP · Assinatura de Vagas · ERP Manutenção · ERP Operadores · ERP Cursos · ERP Agrícola · ERP Aeródromos · Publicações** (v2 — sem "Recrutamento" como produto).
- Detalhe (plano, início, renovação, faturas) + **Cancelar/Reativar**.
- Cancelamento/suspensão → migração de custódia do estoque de volta à Rconta (evento no ledger). Regularização → o sistema pergunta se restaura os estoques.

### 13.3 Personalização
```sql
CREATE TABLE identity.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES identity.users(id),
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'LIGHT'
      CHECK (theme_mode IN ('LIGHT','DARK','CUSTOM')),
    font_family VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
    font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    background_color VARCHAR(20),
    language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Ícone de tema alterna a cada clique: **claro → escuro → personalizado → claro**.

### 13.4 Segurança
- Senha alterável; cada troca **desconecta os dispositivos**.
- Dispositivos: lista com sessão ativa; desconectar individual ou todos.
- 2FA: TOTP (Google Authenticator), SMS ou e-mail.
```sql
CREATE TABLE identity.security_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- WEB, MOBILE, API
    user_agent TEXT,
    ip_address VARCHAR(45),
    last_seen_at TIMESTAMPTZ,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.security_settings (
    user_id UUID PRIMARY KEY REFERENCES identity.users(id),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_method VARCHAR(20), -- TOTP_GOOGLE, SMS, EMAIL
    two_factor_secret_cipher VARCHAR(512), -- criptografado (nunca em claro)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 14. ESTOQUE NO NÚCLEO E CUSTÓDIA (catálogo único + bidirecional RLoja ↔ ERP)

### 14.1 Origens do estoque (v2)
- **Estoque pessoal** (Profissional): da pessoa física; gratuito; pode anunciar na RLoja **sem comprar nada**.
- **Estoque empresarial** (Empresarial): **1 estoque por empresa**.
- **Estoque criado na RLoja (v2):** empresa sem assinatura cria estoque com perfil privado na RLoja; ao contratar ERP, as lojas ativas/inativas **viram estoque no ERP** automaticamente (evento de custódia no ledger).
- **Catálogo único** no núcleo — Rconta, RLoja e ERPs inserem/buscam nele, nunca em catálogos paralelos.
- **Custódia com ERP contratado:** o estoque empresarial **migra para o ERP** (evento no ledger).
- **Suspensão/cancelamento:** estoque volta à Rconta (Empresarial) como **UM único estoque**, com marcação de origem por item.
- **Regularização:** o sistema **pergunta** se restaura as posições originais; itens vendidos não voltam.

### 14.2 Entidades
```sql
-- SCHEMA: stock
CREATE TABLE stock.company_stocks ( -- 1 estoque por empresa
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    custody VARCHAR(50) NOT NULL DEFAULT 'RCONTA'
      CHECK (custody IN ('RCONTA','RLOJA','ERP_OPERADORES','ERP_MANUTENCAO','ERP_CURSOS','ERP_AGRICOLA','ERP_AERODROMOS')),
    name VARCHAR(255) NOT NULL DEFAULT 'Estoque da Empresa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.personal_stock ( -- estoque pessoal (Profissional)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.stock_custody_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL,
    stock_owner_type VARCHAR(20) NOT NULL CHECK (stock_owner_type IN ('COMPANY','PERSON')),
    from_custody VARCHAR(50) NOT NULL,
    to_custody VARCHAR(50) NOT NULL,
    reason VARCHAR(50) NOT NULL
      CHECK (reason IN ('ERP_CONTRACTED','ERP_SUSPENDED','ERP_CANCELLED','ERP_REACTIVATED','REGULARIZED','RLOJA_TO_ERP','ERLOJA_CREATED')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL,
    stock_owner_type VARCHAR(20) NOT NULL CHECK (stock_owner_type IN ('COMPANY','PERSON')),
    catalog_item_id UUID NOT NULL, -- item do catálogo do Núcleo (fonte da verdade)
    origin_erp VARCHAR(50), -- preenchido quando o item veio de um ERP/RLoja (rastreabilidade)
    origin_erp_stock_label VARCHAR(255),
    serial_number VARCHAR(100),
    condition VARCHAR(50) NOT NULL DEFAULT 'NOVO',
    tag VARCHAR(50) NOT NULL DEFAULT 'VERDE_SERVICAVEL',
    quantity NUMERIC(15,2) NOT NULL DEFAULT 1,
    unit VARCHAR(10) NOT NULL DEFAULT 'UN',
    status VARCHAR(50) NOT NULL DEFAULT 'EM_ESTOQUE'
      CHECK (status IN ('EM_ESTOQUE','QUARENTENA','RESERVADO','INSTALADO','VENDIDO','DESCARTADO')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 14.3 Fluxo de restauração do estoque residual
1. ERP suspenso/cancelado → custódia volta à Rconta como **um único estoque**; cada item mantém `origin_erp` e `origin_erp_stock_label` rastreados no ledger.
2. Itens **vendidos** durante a vigência **não voltam**.
3. Ao regularizar/reativar, o sistema **pergunta**: *"Restaurar os estoques como estavam antes?"*
   - **Sim** → remanescentes retornam às posições originais.
   - **Não** → permanece o estoque único na Rconta.

## 15. RECRUTAMENTO COMO AGREGADOR (2 origens, sem comissão — v2)

### 15.1 Princípio
> **O Recrutamento NÃO possui cadastro próprio de pessoas/currículos** — perfis vêm do núcleo (e são **editáveis** pelo Recrutamento, com origem no ledger). **Vagas nascem no RH de cada ERP OU no próprio Recrutamento** (para quem não tem ERP) — ambos espelham o núcleo. **Sem comissão**: embutido na assinatura de todo ERP, ou Assinatura de Vagas para quem não tem ERP. **Pessoas nunca pagam.**

### 15.2 Vagas: externas vs internas
| Tipo | Visibilidade |
|------|--------------|
| **Externa** (público externo) | Listada **livremente** |
| **Interna** (somente funcionários) | Disponível **somente** para funcionários com vínculo ativo na empresa |

### 15.3 Entidades
```sql
-- SCHEMA: recruitment (apenas referências ao núcleo e aos ERPs — sem duplicação)
CREATE TABLE recruitment.job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    role VARCHAR(100),              -- cargo (v2: RH completo)
    function_name VARCHAR(100),     -- função (v2)
    salary_range NUMERIC(15,2),     -- salário (v2)
    requirements TEXT,              -- requisitos (v2)
    objectives TEXT,                -- objetivo (v2)
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('EXTERNAL','INTERNAL')),
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTA'
      CHECK (status IN ('ABERTA','PAUSADA','FECHADA')),
    origin_app VARCHAR(50) NOT NULL, -- ERP_* ou RECRUTAMENTO (v2: 2 origens)
    source_entity_id UUID NOT NULL,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recruitment.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id), -- candidato (do núcleo)
    job_posting_id UUID NOT NULL REFERENCES recruitment.job_postings(id),
    candidate_profile_snapshot JSONB NOT NULL, -- snapshot do perfil no momento da candidatura
    status VARCHAR(50) NOT NULL DEFAULT 'CANDIDATADO'
      CHECK (status IN ('CANDIDATADO','EM_ANALISE','ENTREVISTA','APROVADO','REPROVADO','CONTRATADO','CANCELADO')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recruitment.application_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES recruitment.applications(id),
    stage VARCHAR(50) NOT NULL, -- TRIAGEM, ENTREVISTA, TESTE, PROPOSTA, CONTRATACAO
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES identity.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ledger_block_id UUID
);

CREATE TABLE recruitment.application_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES recruitment.applications(id),
    sender_id UUID NOT NULL REFERENCES identity.users(id),
    recipient_id UUID NOT NULL REFERENCES identity.users(id),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ledger_block_id UUID
);
```

### 15.4 Fluxo do processo seletivo
1. **Vaga criada** (no RH do ERP ou no Recrutamento) → evento no ledger (`origin_app`) → visão do Recrutamento atualizada via event bus.
2. **Candidato se candidata** → cria `application` com **snapshot do perfil** → evento no ledger.
3. **Etapas** (triagem, entrevista, teste, proposta) → cada etapa gera bloco no ledger.
4. **Comunicação** via `application_messages` → cada mensagem gera bloco no ledger.
5. **Contratação finalizada** → o sistema **cria automaticamente o vínculo** (via `professional.work_experiences`) → evento no ledger — **sem cobrança alguma** (v2).
6. **Histórico exibido** = **filtro do Ledger** — nunca duplicado.

### 15.5 Regras do Recrutamento
1. NUNCA cria pessoa/curso/certificado próprio — lê e edita o perfil do núcleo (origem no ledger).
2. Vaga interna visível apenas para funcionário com vínculo ativo.
3. Vaga externa listada livremente.
4. Snapshot do perfil capturado no momento da candidatura (integridade histórica).
5. Todo evento gera bloco no ledger.
6. Contratação finalizada cria vínculo automático — **sem comissão** (v2).
7. O histórico exibido é SEMPRE um filtro do ledger.

## 16. PERMISSÕES: RBAC + ABAC + RLS

- Papéis (RBAC): ADMIN, LEGAL, PROCURADOR, FUNCIONARIO, USER. Posições funcionais (enum extensível): PILOTO, CONTROLADOR_TECNICO, MECANICO, AUXILIAR, APOIO_SOLO, GERENTE_RESPONSAVEL, GERENTE_QUALIDADE, GESTOR_SGSO, DIRETOR_MANUTENCAO, DIRETOR_OPERACAO, ADMINISTRATIVO, INSTRUTOR, EXAMINADOR.
- ABAC: access_level, tipo da entidade, vínculo ativo, procuração vigente, plano.
- RLS: políticas que combinam `tenant_id` (via tenant_users) E `company_id` (via relationships). Funções SQL `current_tenant_ids()`, `current_company_ids()`. Usuário sem tenant/empresa não vê NADA (403).
- **Console do Núcleo:** papel próprio de admin da plataforma; vê estados/métricas, nunca conteúdo (zero-trust — contrato seção 5-A).

## 17. SEGURANÇA E OBSERVABILIDADE

- JWT obrigatório; RBAC + ABAC no middleware; RLS no PostgreSQL.
- Secrets via env/secret manager; nunca commitar `.env` (GitGuardian).
- Rate limit (Redis): auth 10/min, leitura 300/min, escrita 60/min, upload 20/min.
- Queries parametrizadas; validação de inputs (422); restrição de uploads (tipo/tamanho/hash).
- Pino + Prometheus + OpenTelemetry; `GET /health` em cada serviço.

## 18. PADRÕES OBRIGATÓRIOS DE FRONTEND (Angular v2)

1. Componentes **standalone** com **signals** + **OnPush** — sem `NgModule`.
2. Injeção com **`inject()`** — construtor de DI proibido em código novo.
3. Controle de fluxo **`@if`/`@for`/`@switch`** — `*ngIf`/`*ngFor` proibidos em código novo.
4. `input()`/`output()` function-based; formulários reativos **tipados** (`NonNullableFormBuilder`).
5. Estado de componente com signals; estado complexo local com NgRx ComponentStore.
6. Chamadas HTTP via services com `inject(HttpClient)`; interceptors em `libs/core` (token, erro padrão `{success,data,error}`, idempotency-key).
7. Toda tela de escrita valida permissão no backend; guards/hides são UX.
8. Histórico sempre via **LedgerTimeline** (nunca lista editável).

## 19. TESTES OBRIGATÓRIOS DA PARTE 1

1. Teste de RLS: usuário sem vínculo recebe 403 e não vê dados.
2. Teste de idempotency: retry não duplica.
3. Teste de padrão de resposta: 100% das rotas em `{ success, data, error }`.
4. Teste de isolamento de apps: falha no lazy load de uma feature-lib não derruba a Shell.
5. Teste de MDM: uma pessoa = um perfil; sem duplicação.
6. Teste de dados cadastrais: múltiplos contatos/endereços/documentos/redes sociais por pessoa.
7. Teste de validação em níveis: dado sem validação é exibido (sem selo); N1/N2/N3 elevam o selo; nada bloqueia.
8. Teste de CPF/CNPJ: dígito verificador; inválido rejeitado.
9. Teste de CEP: ViaCEP preenche rua/bairro/cidade/UF; CEP inválido rejeitado.
10. Teste de módulo profissional: curso/treinamento/certificado no núcleo; anexo gera hash.
11. Teste de CIV: lançamento exige assinatura; instrução exige endosso; draft/signed/rectified/voided.
12. Teste de CMA: vencido ou classe inadequada bloqueia despacho; alerta 30 dias.
13. Teste de vínculo misto: pessoa inicia → empresa aprova → ATIVO; empresa inicia → pessoa confirma → ATIVO; pendente sem selo.
14. Teste de declaração de experiência: solicitada pelo funcionário OU gerada no desligamento; documento assinado.
15. Teste de módulo empresarial: documento digital assinado de responsabilidade/procuração aprovada.
16. Teste de estoque pessoal: pessoa com Rconta grátis cria estoque e anuncia sem assinatura.
17. Teste de estoque empresarial: 1 estoque por empresa.
18. Teste de estoque criado na RLoja: migra ao ERP ao contratar (evento de custódia no ledger).
19. Teste de custódia: contratar ERP migra custódia (evento no ledger); retorno como estoque único com marcação de origem.
20. Teste de restauração: regularização pergunta e restaura posições originais; itens vendidos não voltam.
21. Teste de recrutamento: não cria cadastro próprio; vaga interna visível só para funcionário; externa livre; **2 origens de vaga** (ERP e Recrutamento).
22. Teste de snapshot: perfil capturado na candidatura permanece íntegro.
23. Teste de contratação: finalizar cria vínculo automático — **sem cobrança** (sem comissão).
24. Teste de multi-app de escrita: currículo editado pela Rconta E pelo Recrutamento → mesmo cadastro no núcleo, `origin_app` diferente no ledger.
25. Teste de module boundaries: `feature-*` não se importam entre si (ESLint falha o build).
26. Teste de personalização: claro → escuro → personalizado alternando a cada clique.
27. Teste de segurança: troca de senha desconecta dispositivos; 2FA TOTP funcional.

## 20. CRITÉRIOS DE ACEITE DA PARTE 1

- [ ] Workspace Nx com frontend SPA + backend NestJS; docker-compose sobe tudo; `/health` verde; `nx affected` no CI.
- [ ] Schemas PostgreSQL criados (identity, professional, stock, recruitment, ledger, protocol, documents, catalog, subscriptions, oauth, signatures, compliance, notifications, market, communication, accounting, mro, ops, training, agri, airport, travel, charter, anac, certpub).
- [ ] Shell Angular (SPA única) com lazy loading das 13 feature-libs; subdomínio resolve a rota inicial.
- [ ] Module boundaries enforced (feature-libs isoladas; comunicação só via `libs/core`).
- [ ] Design System `libs/ui` com tokens, temas e **ValidationBadge** + **LedgerTimeline**.
- [ ] `libs/shared-dto` como fonte única de contratos (front + back).
- [ ] Núcleo operando: Cadastro Central (pessoas, empresas, vínculos, contatos, endereços, documentos) com escrita multi-app e `origin_app` no ledger.
- [ ] Rconta com **7 módulos + 2 menus** implementados (consumindo o núcleo).
- [ ] Módulo Pessoal: dados cadastrais completos com validação N0–N3.
- [ ] Módulo Profissional: currículo, CIV, CMA, certificados, **declarações de experiência** e **estoque pessoal**.
- [ ] Módulo Empresarial: responsáveis, procuradores, empresas vinculadas, documentos assinados, **1 estoque por empresa**, timeline da assinatura.
- [ ] Módulos Protocolo, Assinaturas (v2: sem Recrutamento como produto), Personalização e Segurança implementados.
- [ ] Estoque com catálogo único, custódia ERP ↔ Rconta ↔ RLoja e fluxo de restauração.
- [ ] Recrutamento com 2 origens de vagas, perfil editável, snapshot e contratação automática **sem comissão**.
- [ ] RLS habilitado e forçado; padrão de resposta global.
- [ ] Testes de aceite passando; lacunas listadas.
