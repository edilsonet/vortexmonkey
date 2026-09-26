# VORTEX v4 — PARTE 01/14: NÚCLEO (nucleo.vortex.com — serviço central, não vendido)

> **Esta parte consolida as partes 1, 2, 3, 4, 8 e 10 da v2 no serviço central do ecossistema:** fundação Nx, Cadastro Central, Ledger imutável com conteúdo cifrado, Protocolo eletrônico, Documentos/Assinatura (bloco SEI), Billing/Alertas, BRE, Integrações, Central de Comunicação e Console do Núcleo.
> **Os apps (partes 02–14 da v4) apenas consomem o Núcleo** — inserem via API e leem dele; nenhum mantém cadastro, histórico ou catálogo próprio. Conteúdo regulatório e técnico copiado verbatim das fontes v2; apenas reorganizado e sem duplicação.
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em arquitetura enterprise, multi-tenancy, integridade criptográfica, assinatura eletrônica, billing multi-tenant e aviação civil regulada. Construa o NÚCLEO do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 01

Estabelecer o serviço central do ecossistema VORTEX (`nucleo.vortex.com`) — a fonte única de verdade, **não vendida**:

1. **Fundação Nx** — workspace com frontend (SPA única Angular) e backend (NestJS) no mesmo repositório, `libs/shared-dto` como fonte única de contratos, Shell Angular (Opção A), Design System `@vortex/ui`, RBAC/ABAC/RLS, segurança e observabilidade.
2. **Cadastro Central** — Pessoas, Profissionais, Empresas, Estoque, Catálogo e Documentos: o único dono de cadastros; **todos os apps inserem e consomem via API**.
3. **Ledger imutável com conteúdo cifrado** — razão criptográfico encadeado (SHA-256 + Ed25519), payload cifrado em repouso (AES-256-GCM por tenant), acesso governado por concessões (zero-trust), trilha de auditoria e restauração reconciliada.
4. **Protocolo eletrônico** — geração e rastreio de protocolos no formato `AAAA-NNNNNN` (Resolução ANAC nº 520/2019).
5. **Assinatura digital + Documentos + Arquivos + LGPD** — assinatura em níveis (Lei nº 14.063/2020) com bloco padrão SEI/ANAC, documentos estruturados com hash, MinIO com presigned URLs e compliance LGPD completo.
6. **Billing e Subscriptions** — planos, tenants, medição de uso, cobrança recorrente (Asaas) e comissões acionadas por eventos do ledger.
7. **Hub de Alertas Preditivos** — alertas automáticos de vencimento, bloqueio e conformidade em todo o ecossistema.
8. **Motor de Regras (BRE)** — centraliza as regras de negócio de todo o ecossistema, sem hardcode.
9. **Integrações externas** — ANAC (RAB, SEI, S141, SIGRA), validação N2 (gov.br, Receita, Correios, SACI), Asaas, Resend, Sentry, GitGuardian.
10. **Central de Comunicação** — chat (WebSockets), alertas, e-mails e comunicados oficiais na barra superior da Shell.
11. **Console do Núcleo** — interface de gestão restrita aos administradores da plataforma: vê estados e métricas, **nunca conteúdo** (zero-trust — "administrar sem ver").

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

> Referências ao contrato global (`CLAUDE.md v2`): princípios (seção 3), ledger (seção 5-A), bloco de assinatura (seção 5-B), contabilidade (seção 6), Shell (seção 7), regras de engenharia (seção 8), monorepo (seção 10), apps (seção 11). Em divergência de valores, prevalece o `docs/07-delimitacao.md`; em divergência de arquitetura, prevalece o `CLAUDE.md v2`.

### 2.1 Princípio arquitetural central (IMUTÁVEL)

> **O NÚCLEO é o DONO DA VERDADE — serviço próprio, separado da Rconta. TODOS os apps, sem exceção (Rconta, ERPs, RLoja, Recrutamento, Travel, Fretamento, App ANAC, Certificações e Publicações e futuros), são CONSUMIDORES: inserem no núcleo via API e consomem dele. Nenhum app cria cadastro próprio de pessoa, produto, vaga ou currículo.**

- O mesmo dado pode ser criado/editado por **qualquer app autorizado** (ex.: currículo pela Rconta OU pelo Recrutamento; endereço pela Rconta, RLoja OU Recrutamento). O que muda é apenas o campo **`origin_app`** no evento do ledger; o cadastro vive **uma única vez** no núcleo.
- O histórico de tudo é o **Ledger** — linha do tempo com conteúdo completo (quem/papel, início, fim, o quê, app de origem), cifrado em repouso. Apps exibem **filtros projetados do ledger** — nunca histórico duplicado.
- Quando uma contratação é finalizada, o sistema **cria automaticamente o vínculo** entre a pessoa contratada e o RH do ERP correspondente (sem cobrança — Recrutamento sem comissão).
- O Núcleo pode se ligar por meio de API a gov.br, Google, Microsoft e outros provedores.

### 2.2 Princípios do contrato aplicáveis a esta parte (CLAUDE.md v2, seção 3 — extrato)

1. **Núcleo dono da verdade — separado da Rconta:** concentra Pessoas, Profissionais, Empresas, Estoque, Catálogo, Documentos, **Ledger** e Protocolo; todos os apps apenas inserem e consomem (origem no ledger).
2. **Ledger imutável (append-only) — linha do tempo com conteúdo:** hash SHA-256 encadeado + assinatura Ed25519; payload com o conteúdo completo do que aconteceu; **o ledger É a linha do tempo** — não existe timeline separada nem histórico duplicado; UPDATE/DELETE bloqueados por trigger; payload cifrado em repouso e acesso descriptografado governado (seção 5-A).
3. **Validação em níveis que nunca bloqueia fluxo:** N0 pendente (⚪) → N1 sistema (🟡) → N2 fonte oficial (🟢 gov/Receita/Correios/SACI/RAB) → N3 empresa/administrador (🔵 autêntico). Dado pendente é exibido sem selo; o fluxo nunca para por aprovação.
4. **Vínculo misto com dupla confirmação:** pessoa↔empresa só fica ATIVO quando os dois lados aprovam.
5. **Monetização:** RLoja por comissão de 3% do vendedor; Recrutamento SEM comissão; 8 produtos por assinatura (Rconta VIP, Assinatura de Vagas, 5 ERPs, Publicações). **Catálogo não é vendido** (serviço do Núcleo, só inserção/busca). **Núcleo e App ANAC não são vendidos.**
6. **Estoque e custódia:** estoque pessoal no módulo Profissional; estoque empresarial (1 por empresa) no módulo Empresarial; catálogo único no Núcleo. Contratou ERP → custódia migra para o ERP. Suspendeu/cancelou → estoque volta à Rconta como **um único estoque** com marcação de origem por item. Regularizou → o sistema **pergunta** se restaura as posições originais; itens vendidos não voltam.
7. **Banners:** Rconta grátis exibe anúncios; Rconta VIP ou compra de qualquer ERP remove os anúncios **apenas na Rconta do comprador**.
8. **Dois livros, dois propósitos:** o **ledger regulatório** (Res. 458/2017) registra eventos de domínio; a **Contabilidade** (dupla entrada) escritura o financeiro — um não substitui o outro.
9. **Registro é um só; o resto é projeção:** eventos primários nascem uma única vez no ledger; totais e mapas são **projeções agregadas recomputáveis**.
10. **Plataforma multi-tenant; RLoja multi-vendor:** a plataforma é multi-tenant (RLS por linha); a RLoja é marketplace multi-vendor — vender não exige tenant nem assinatura.

### 2.3 Stack (IMUTÁVEL — do CLAUDE.md v2)

- **Monorepo:** Nx (frontend + backend no mesmo workspace). CI com `nx affected`.
- **Backend:** NestJS (TypeScript estrito), PostgreSQL 16 com RLS, TypeORM + SQL nativo (policies, triggers, PL/pgSQL). **Sem Prisma, sem CQRS, sem TimescaleDB.**
- **Infra:** Redis (cache/sessão/rate-limit), RabbitMQ (eventos), MinIO (arquivos), WebSockets (tempo real).
- **Frontend:** Angular 19+ — standalone components, **signals**, **`inject()`** (nunca construtor em código novo), **`@if`/`@for`/`@switch`** (nunca `*ngIf`/`*ngFor` em código novo), `input()`/`output()`, `ChangeDetectionStrategy.OnPush` em todos os componentes, formulários reativos **tipados**.
- **UI:** Angular Material + Design System próprio (`libs/ui`).
- **Estado:** signals para componente; NgRx ComponentStore apenas para estado complexo local de feature-lib. Sem NgRx global.
- **Backend único:** `api.vortex.com`. **SPA única** com subdomínios resolvendo a rota inicial.
- **Multi-tenant:** lógico (RLS por linha). Tenant é CONTEXTO, nunca dono do dado. **RLoja é multi-vendor** — vender não exige tenant nem assinatura.

### 2.4 As 10 regras imutáveis (contrato global)

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

### 2.5 Estrutura do workspace Nx

```
/apps
  vortex-web             # SPA única Angular (host; rotas por subdomínio)
  api-gateway            # gateway, rate limit, idempotência
  auth-service           # login, refresh, 2FA, sessões
  ledger-service         # ledger imutável (conteúdo cifrado — M3)
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
  certifications-service # Certificações (Parte 13)
  publications-service   # Publicações (Parte 14)
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
  feature-certificacoes  # Certificações (Parte 13)
  feature-publicacoes    # Publicações (Parte 14)
  util-*                 # helpers (datas regulatórias, moeda, unidades RBAC 01)
/tools, /migrations, /seeds
```

**Regras de module boundaries (ESLint `@nx/enforce-module-boundaries` — obrigatórias desde o dia 1):**
1. `feature-*` NÃO se importam entre si (garante o desmembramento A→B→C sem reescrever telas).
2. `feature-*` só importam `shared-dto`, `ui`, `core` e `util-*`.
3. Comunicação entre apps só via `libs/core` (serviços de sessão/permissões) — nunca via import direto.
4. Rotas raiz: `app.routes.ts` do shell apenas referencia `loadChildren` de cada feature-lib.

Schemas PostgreSQL: `identity` · `professional` · `stock` · `recruitment` · `market` · `communication` · `accounting` · `mro` · `ops` · `training` · `agri` · `airport` · `ledger` · `protocol` · `documents` · `signatures` · `catalog` · `subscriptions` · `oauth` · `compliance` · `notifications` · `travel` · `charter` · `anac` · `certifications` · `publications`.

### 2.6 Permissões: RBAC + ABAC + RLS

- Papéis (RBAC): ADMIN, LEGAL, PROCURADOR, FUNCIONARIO, USER. Posições funcionais (enum extensível): PILOTO, CONTROLADOR_TECNICO, MECANICO, AUXILIAR, APOIO_SOLO, GERENTE_RESPONSAVEL, GERENTE_QUALIDADE, GESTOR_SGSO, DIRETOR_MANUTENCAO, DIRETOR_OPERACAO, ADMINISTRATIVO, INSTRUTOR, EXAMINADOR.
- ABAC: access_level, tipo da entidade, vínculo ativo, procuração vigente, plano.
- RLS: políticas que combinam `tenant_id` (via tenant_users) E `company_id` (via relationships). Funções SQL `current_tenant_ids()`, `current_company_ids()`. Usuário sem tenant/empresa não vê NADA (403).
- **Console do Núcleo:** papel próprio de admin da plataforma; vê estados/métricas, nunca conteúdo (zero-trust — contrato seção 5-A).

### 2.7 Segurança e observabilidade

- JWT obrigatório; RBAC + ABAC no middleware; RLS no PostgreSQL.
- Secrets via env/secret manager; nunca commitar `.env` (GitGuardian).
- Rate limit (Redis): auth 10/min, leitura 300/min, escrita 60/min, upload 20/min.
- Queries parametrizadas; validação de inputs (422); restrição de uploads (tipo/tamanho/hash).
- Pino + Prometheus + OpenTelemetry; `GET /health` em cada serviço.

### 2.8 Ledger — acesso governado (resumo do contrato 5-A)

> **Modelo zero-trust: administrar sem ver.** O payload é **cifrado em repouso**; hash e assinatura ficam sempre em claro. **Ninguém acessa conteúdo por padrão — nem os administradores da plataforma.** Toda abertura de acesso é, ela mesma, um evento no ledger.

- **Dono do dado:** seus filtros e ERPs com vínculo — enquanto durar o vínculo. **Empresa/assinante:** filtro completo da assinatura; encerrada → histórico **congela** mas permanece legível e retido (mínimo 5 anos).
- **Administradores:** acesso a conteúdo **só com protocolo** do próprio dono; meta-eventos (quem, escopo, quando, protocolo); revisão pelos **proprietários do VORTEX**; concessão temporária; dono notificado.
- **ANAC:** exclusivamente pelo **App ANAC** (Parte 06/14 da v4 — App ANAC) — consentida → recusa → suspensão de certificação → compulsória; somente leitura; somente o solicitante vê; auditado notificado (exceto segredo de justiça).
- **Justiça (segredo de justiça):** só admin autorizador + proprietários; meta-eventos confidenciais; sem notificação ao auditado enquanto durar o segredo.
- **Implementação:** AES-256-GCM com chave de dados por tenant (envelope); **admins NÃO detêm chaves de tenant** — a única via de descriptografia é o **serviço de concessão**. Integridade verificável sobre os dados cifrados. **RLS + criptografia são camadas complementares.** (Detalhes e schemas verbatim na seção M3.)

### 2.9 Continuidade e infraestrutura (contrato 5-A.6 / 5-A.7 — resumo)

1. **A cadeia de hashes detecta violação; o backup restaura o conteúdo** (job de verificação 6h localiza onde rompeu).
2. Snapshot diário + WAL/PITR; backup imutável offsite (WORM) cifrado com chave própria; MinIO com versionamento + replicação offsite.
3. **Restauração reconciliada (anti-fraude):** validada contra a cadeia de hashes; gera meta-evento `SYSTEM_RESTORED`. O ledger é a régua; o backup é a cópia. Teste de restauração trimestral.
4. **Infraestrutura:** piloto = VPS principal + segundo VPS em conta separada (preferir provedor diferente) com repositório append-only (restic); produção = object storage com Object Lock/WORM + regra 3-2-1; chave de backup fora do VPS principal; GitHub versiona código apenas. (Procedimento verbatim na seção M3.7.)

## 3. FUNDAMENTAÇÃO REGULATÓRIA

### 3.1 Registros eletrônicos e protocolo

- **Resolução ANAC nº 458/2017:** dispõe sobre o uso de sistemas computadorizados para guarda e emissão de registros aeronáuticos, exigindo integridade, autenticidade e imutabilidade dos registros eletrônicos.
- **Resolução ANAC nº 520/2019:** institui o protocolo eletrônico de documentos, com formato de numeração sequencial anual (`AAAA-NNNNNN`).
- **Lei nº 12.965/2014 (Marco Civil) e LGPD (Lei nº 13.709/2018):** requisitos de segurança, rastreabilidade e proteção de dados nos registros.

### 3.2 Assinatura eletrônica

- **Lei nº 14.063/2020:** assinaturas eletrônicas em interações com entes públicos e atos jurídicos — níveis **simples**, **avançada** e **qualificada (ICP-Brasil)**.
- **Decreto nº 10.543/2020, art. 4º:** fundamento do manifesto do bloco de assinatura (padrão SEI).
- **MP nº 2.200-2/2001:** institui a ICP-Brasil.

### 3.3 LGPD (Lei nº 13.709/2018)

- **Portabilidade (art. 18, II)**, **eliminação (art. 18, VI — com ressalvas de retenção legal)**, **consentimento (art. 8º — revogável a qualquer momento)**, prazo de atendimento de **15 dias (art. 19)**.

### 3.4 PPSP — RBAC 120 (fundamentação para o módulo ARSO/toxicológico do Núcleo)

- RBAC 120: aplicabilidade (120.1), definições PPSP/ARSO (120.3), pessoal abrangido ARSO (120.5), substâncias psicoativas (120.7, Portaria SVS/MS 344/98 e álcool), programa de prevenção (120.9), manual de prevenção (120.11), declaração de conformidade (120.13), exames toxicológicos (120.15), registros do programa no ledger (120.17), educação e treinamento (120.19), supervisão (120.21), afastamento do ARSO (120.23).
- IS 120-002D: orientações de implantação, identificação de ARSO, exame de janela longa, subprogramas de educação.
- **Nota:** o RBAC 120 EMD 04 trata do PPSP (prevenção ao uso de substâncias psicoativas), NÃO do SGSO. O SGSO da OM 145 está na IS 145.214-001B; o SGSO dos operadores está no RBAC 121.1225-001.

## 4. ESTRUTURA DE MENUS

### 4.1 Shell (global — todos os apps; docs/10 §0)

- **Top bar:** logo (white-label no Enterprise) · seletor de app (14 apps autorizados ao usuário) · Central de Comunicação (Chat `[chat websocket]` · Alertas com badges `[lista]` · E-mails `[lista → leitor]` · Comunicados `[lista → detalhe]`) · Tema `[toggle 3 estados]` · perfil/sessão.
- **Sidebar:** menus do app ativo, gerados por permissão (UX).
- **Padrão de detalhe:** abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.
- **Rotas:** cada app = `loadChildren` de sua feature-lib; guards de permissão (UX) + validação no backend (verdade).

### 4.2 Núcleo (`nucleo.vortex.com`) — console de gestão (restrito a admins da plataforma; zero-trust — docs/10 §1)

> O console vê **estados e métricas, nunca conteúdo**. Toda ação exige protocolo e vira meta-evento no ledger.

- Dashboard `[KPIs de plataforma: tenants ativos, apps, integridade do ledger, fila de concessões]`
- **Tenants** `[lista → detalhe: estado, assinaturas, métricas de uso — sem conteúdo]`
- **Concessões de acesso** `[lista → detalhe: tipo (DONO/SUPORTE_PROTOCOLO/AUDITORIA_CONSENTIDA/AUDITORIA_COMPULSORIA/JUSTICA), escopo, validade, status]`
  - Nova concessão por protocolo `[form: nº do protocolo + escopo mínimo]` → execução às cegas `[form escopado]`
- **Revisão de descriptografias** `[lista de meta-eventos → relatório: quem, escopo, protocolo, quando]`
- **Integridade do ledger** `[status da cadeia → verificação por intervalo → relatório de quebras]`
- **Catálogo** `[lista → detalhe]` · deduplicação/taxonomia `[árvore ATA]`
- **Auditoria da plataforma** `[timeline de meta-eventos]`
- **Restaurações** `[histórico SYSTEM_RESTORED → nova restauração reconciliada]`
- **Configuração** `[papéis de admin, parâmetros da plataforma]`

### 4.3 Rconta — 7 módulos + 2 menus (consome o núcleo; referência do consumo — docs/10 §2)

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

> A Rconta é a experiência do usuário **sobre o núcleo** — os mesmos dados são acessíveis pelos demais apps autorizados. Os módulos Pessoal, Profissional, Empresarial, Protocolo e Assinaturas são servidos pelas entidades do Cadastro Central, Ledger, Protocolo e Billing especificados nas seções M2–M5 abaixo.

## 5. ENTIDADES PRINCIPAIS

### M1 — Entidades base da fundação (Cadastro Central — schemas `identity`)

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
    ledger_block_id UUID, -- referencia ledger.ledger_blocks
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### M2 — Módulo Pessoal (dados cadastrais — residem no NÚCLEO)

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

**Regras do módulo pessoal:**
1. Múltiplos contatos, endereços, documentos e redes sociais por pessoa — sem duplicação.
2. Um contato/endereço marcado como **principal** por tipo.
3. Toda validação/criação gera bloco no ledger (com `origin_app`).
4. Dados pessoais exibidos com **ValidationBadge** conforme o nível.
5. **Editável pela Rconta, RLoja (dados de compra) e Recrutamento (perfil)** — mesmo cadastro no núcleo.

### M2 — Módulo Profissional (currículo, CIV, CMA, declarações, estoque pessoal — residem no NÚCLEO)

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

**CIV — Caderneta Individual de Voo (RBAC 61 / IS 61-001G):**

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

**CMA — Certificado Médico Aeronáutico (RBAC 67):**

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

**Vínculos de experiência profissional (pessoa ↔ empresa) — dupla confirmação mista:**

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

**Declarações automáticas de experiência:**

```sql
CREATE TABLE professional.experience_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_experience_id UUID NOT NULL REFERENCES professional.work_experiences(id),
    requested_by UUID NOT NULL REFERENCES identity.users(id),
    request_origin VARCHAR(20) NOT NULL CHECK (request_origin IN ('FUNCIONARIO','DESLIGAMENTO_EMPRESA')),
    statement_document_id UUID, -- documento estruturado assinado (seção M5)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> Regra: é **direito do trabalhador** ter a declaração de que exerceu o cargo/função pelo período X — a pedido dele ou quando a empresa encerra o vínculo. Documento estruturado, assinado, gerado do histórico de vínculo do núcleo e ancorado no ledger. Solicitável pela Rconta **ou** pelo Recrutamento.

**Regras do módulo profissional:**
1. Curso/treinamento/certificado/vínculo/CIV/CMA/declaração são criados **no núcleo** — nenhum app cria cadastro próprio.
2. **Editável pela Rconta E pelo Recrutamento** (perfil profissional completo) — origem no ledger.
3. Certificado anexado gera hash SHA-256 e é armazenado no MinIO.
4. Validação em níveis N0–N3; nada é bloqueado por falta de validação.
5. Lançamento na CIV exige **assinatura do piloto**; voo de instrução exige **endosso do instrutor**; correção gera `rectified`; cancelamento gera `voided`.
6. O evento `FLIGHT_CLOSED` do ERP pode **pré-preencher rascunho** na CIV — só vira registro assinado após confirmação do piloto.
7. Toda criação/validação/rejeição gera bloco no ledger.

### M2 — Módulo Empresarial (responsáveis, procuradores, empresas, estoque)

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
    binding_document_id UUID, -- documents.documents (seção M5)
    binding_signature_id UUID, -- signatures.signatures (seção M5)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Regras do módulo empresarial:**
1. Lista as empresas em que a pessoa tem **responsabilidade legal**, **procuração** ou **vínculo de funcionário**.
2. **Documento digital assinado** para cada responsabilidade/procuração aprovada.
3. Ao clicar na empresa: cadastro completo + **[timeline da assinatura]** (histórico desde a compra; congelado e legível por 5 anos após encerramento).
4. **1 estoque por empresa** (ver M2 Estoque).
5. Aprovação de vínculo: **dupla confirmação**; pendente é exibido sem selo.

### M2 — Estoque no Núcleo e custódia (catálogo único + bidirecional RLoja ↔ ERP)

**Origens do estoque:**
- **Estoque pessoal** (Profissional): da pessoa física; gratuito; pode anunciar na RLoja **sem comprar nada**.
- **Estoque empresarial** (Empresarial): **1 estoque por empresa**.
- **Estoque criado na RLoja:** empresa sem assinatura cria estoque com perfil privado na RLoja; ao contratar ERP, as lojas ativas/inativas **viram estoque no ERP** automaticamente (evento de custódia no ledger).
- **Catálogo único** no núcleo — Rconta, RLoja e ERPs inserem/buscam nele, nunca em catálogos paralelos.
- **Custódia com ERP contratado:** o estoque empresarial **migra para o ERP** (evento no ledger).
- **Suspensão/cancelamento:** estoque volta à Rconta (Empresarial) como **UM único estoque**, com marcação de origem por item.
- **Regularização:** o sistema **pergunta** se restaura as posições originais; itens vendidos não voltam.

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

**Fluxo de restauração do estoque residual:**
1. ERP suspenso/cancelado → custódia volta à Rconta como **um único estoque**; cada item mantém `origin_erp` e `origin_erp_stock_label` rastreados no ledger.
2. Itens **vendidos** durante a vigência **não voltam**.
3. Ao regularizar/reativar, o sistema **pergunta**: *"Restaurar os estoques como estavam antes?"*
   - **Sim** → remanescentes retornam às posições originais.
   - **Não** → permanece o estoque único na Rconta.

### M2 — Preferências, dispositivos e segurança (Rconta consome; dados residem no Núcleo)

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

**Regras de personalização e segurança:**
- Ícone de tema alterna a cada clique: **claro → escuro → personalizado → claro**.
- Senha alterável; cada troca **desconecta os dispositivos**.
- Dispositivos: lista com sessão ativa; desconectar individual ou todos.
- 2FA: TOTP (Google Authenticator), SMS ou e-mail.

### M2 — PPSP / ARSO (RBAC 120 — usa o Cadastro Central de Pessoas como fonte única)

```sql
-- SCHEMA: identity (PPSP)
CREATE TABLE identity.arso_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    arso_function VARCHAR(50) NOT NULL CHECK (arso_function IN
      ('PILOTO_COMANDO','COPILOTO','COMISSARIO_VOO','MECANICO_VOO','MECANICO_MANUTENCAO_AERONAUTICA','DESPACHANTE_OPERACIONAL_VOO','OPERADOR_TRATOR_RAMPA_AEROPORTO','AGENTE_PROTECAO_AVSEC')),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.toxicological_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arso_personnel_id UUID NOT NULL REFERENCES identity.arso_personnel(id),
    exam_date DATE NOT NULL,
    validity_end DATE NOT NULL, -- 90 dias (janela longa)
    result VARCHAR(50) NOT NULL CHECK (result IN ('NEGATIVO','POSITIVO','INCONCLUSIVO')),
    laboratory VARCHAR(255),
    report_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Regras de negócio do PPSP:**
1. Validade do exame toxicológico de janela longa: **90 dias** (alerta 15 dias antes).
2. Exame vencido → bloqueio da função crítica (ARSO).
3. Sorteio aleatório inopinado: mínimo de 25% do efetivo ARSO testado por ano (algoritmo auditável, semente ancorada no ledger).
4. Resultado positivo → afastamento imediato e irrevogável, notificação ao Gestor do PPSP.
5. Substâncias rastreadas: álcool etílico, canabinoides, cocaína, opiáceos, anfetaminas, fenciclidina (Portaria 344/98).
6. Registro imutável no ledger (ID 120.17).

### M3 — Entidades do Ledger (schema `ledger`)

```sql
-- SCHEMA: ledger
CREATE SCHEMA IF NOT EXISTS ledger;

CREATE TABLE ledger.ledger_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGSERIAL NOT NULL,               -- índice sequencial global
    previous_hash VARCHAR(64) NOT NULL,           -- hash SHA-256 do bloco anterior
    current_hash VARCHAR(64) NOT NULL,            -- hash SHA-256 deste bloco (sobre payload em claro)
    signature VARCHAR(128) NOT NULL,              -- assinatura Ed25519 (hex)
    public_key VARCHAR(64) NOT NULL,              -- chave pública Ed25519 (hex)
    tenant_id UUID NOT NULL,                      -- metadado em claro (indexável)
    company_id UUID,                              -- metadado em claro (indexável)
    user_id UUID NOT NULL,                        -- autor do evento (metadado em claro)
    actor_role VARCHAR(50) NOT NULL,              -- papel do autor: ADMIN, USER, COMPANY, VENDEDOR, COMPRADOR, AUDITOR, SISTEMA
    origin_app VARCHAR(50) NOT NULL,              -- app de origem: RCONTA, RECRUTAMENTO, RLOJA, ERP_*, TRAVEL, CHARTER, CERTIFICACOES, PUBLICACOES, ANAC, NUCLEO
    action VARCHAR(100) NOT NULL,                 -- ação de domínio (ex.: WORK_ORDER_CREATED)
    entity_name VARCHAR(100) NOT NULL,            -- entidade afetada (ex.: mro.work_orders)
    entity_id UUID NOT NULL,                      -- id da entidade afetada
    payload_ciphertext BYTEA NOT NULL,            -- conteúdo do evento CIFRADO (AES-256-GCM)
    payload_nonce BYTEA NOT NULL,                 -- nonce/IV do AES-GCM
    payload_key_id VARCHAR(100) NOT NULL,         -- referência à chave de dados do tenant (envelope)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta (leitura por entidade/tenant/ação — metadados em claro)
CREATE INDEX idx_ledger_entity ON ledger.ledger_blocks (entity_name, entity_id);
CREATE INDEX idx_ledger_tenant ON ledger.ledger_blocks (tenant_id, created_at);
CREATE INDEX idx_ledger_action ON ledger.ledger_blocks (action, created_at);
CREATE INDEX idx_ledger_origin_app ON ledger.ledger_blocks (origin_app, created_at);
CREATE INDEX idx_ledger_block_index ON ledger.ledger_blocks (block_index);

-- Trigger de imutabilidade (bloqueia UPDATE e DELETE)
CREATE OR REPLACE FUNCTION ledger.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: Registros do Ledger são estritamente imutáveis (Res. ANAC 458/2017). Operação negada.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_immutability
BEFORE UPDATE OR DELETE ON ledger.ledger_blocks
FOR EACH ROW EXECUTE FUNCTION ledger.prevent_mutation();
```

**M3.1 Cálculo do hash do bloco (regra de negócio):**
O `current_hash` é calculado sobre a concatenação canônica de: `block_index`, `previous_hash`, `tenant_id`, `company_id`, `user_id`, `actor_role`, `origin_app`, `action`, `entity_name`, `entity_id`, **payload em claro (JSON canônico serializado, chaves ordenadas)** e `created_at`. O resultado é SHA-256 em hex. A assinatura Ed25519 é aplicada sobre esse hash com a chave privada do serviço de ledger. **O hash é sempre sobre o payload em claro — a cifra não interfere na integridade.**

**M3.2 Fluxo de escrita (append):**
1. Serviço de domínio chama `ledger-service` com o evento estruturado (payload em claro + metadados).
2. O serviço valida permissão (RBAC/ABAC) e a existência do autor.
3. Calcula `content_hash` sobre o payload em claro canônico; assina com Ed25519.
4. Cifra o payload com a chave de dados do tenant (AES-256-GCM, envelope) e insere o bloco (append-only).
5. Retorna o `block_id`.
6. Publica o evento no bus (RabbitMQ) para os consumidores reativos (espelhos).
7. Se aplicável, gera o protocolo (ver M3.6).

**M3.3 Princípios de integridade (IMUTÁVEIS):**
1. **Append-only:** o Ledger só aceita INSERT. UPDATE e DELETE são bloqueados por trigger no banco.
2. **Encadeamento criptográfico:** cada bloco contém o hash do bloco anterior (`previous_hash`), formando uma cadeia contínua.
3. **Assinatura assimétrica:** cada bloco é assinado com chave privada Ed25519; a verificação usa a chave pública correspondente.
4. **Hash de conteúdo:** o `content_hash` é calculado sobre o **payload em claro canônico** (antes da cifra) — a integridade é verificável sem descriptografar.
5. **Payload cifrado em repouso:** o conteúdo do evento é cifrado com **AES-256-GCM** usando chave de dados por tenant (envelope encryption). **Os administradores NÃO detêm as chaves de dados dos tenants.**
6. **Zero-trust ("administrar sem ver"):** ninguém acessa conteúdo por padrão — nem administradores da plataforma. Acesso apenas via concessão ativa (M3.4).
7. **Não repúdio:** o autor do evento (`user_id` + `actor_role`), o tenant, a empresa e o **app de origem** (`origin_app`) são registrados em metadados em claro (fora do payload cifrado).
8. **Verificação contínua:** job periódico percorre a cadeia e valida hashes e assinaturas; inconsistência gera alerta CRITICAL/BLOCKING e aciona o fluxo de restauração (M3.8).
9. **Apps nunca duplicam histórico:** o histórico exibido em qualquer tela é uma projeção (filtro) do Ledger — via **LedgerTimeline**.

### M3.4 Acesso governado ao conteúdo (zero-trust — concessões)

```sql
CREATE TABLE ledger.access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    grant_type VARCHAR(50) NOT NULL
      CHECK (grant_type IN ('DONO','SUPORTE_PROTOCOLO','AUDITORIA_CONSENTIDA','AUDITORIA_COMPULSORIA','JUSTICA')),
    granted_by UUID NOT NULL,             -- quem autorizou (dono, admin, sistema)
    granted_to UUID NOT NULL,             -- quem acessa (usuário, auditor, admin)
    protocol_number VARCHAR(20),          -- obrigatório para SUPORTE_PROTOCOLO
    scope_filter JSONB NOT NULL,          -- escopo mínimo: entity_name, entity_id, tenant, período
    read_only BOOLEAN NOT NULL DEFAULT TRUE,
    confidential BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE para segredo de justiça
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE','EXPIRED','REVOKED')),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meta-eventos do ciclo de acesso (blocos no próprio ledger)
-- Ações: ACCESS_REQUESTED, ACCESS_GRANTED, ACCESS_VIEWED, ACCESS_EXPIRED, ACCESS_REVOKED,
--        SYSTEM_RESTORED, AUDIT_SUSPENSION_APPLIED
```

**Regras de acesso:**
1. **DONO:** o dono do dado acessa seus filtros (cadastro pessoal/profissional, documentos, currículo, empregos, configurações, ERPs com vínculo) enquanto durar o vínculo — descriptografia transparente mediada por permissão.
2. **SUPORTE_PROTOCOLO:** administrador descriptografa **apenas com protocolo do próprio dono** informado na concessão; escopo mínimo; concessão temporária; dono notificado; proprietários do VORTEX revisam o relatório de todas as descriptografias administrativas.
3. **AUDITORIA_CONSENTIDA / AUDITORIA_COMPULSORIA:** via **App ANAC** (Parte 06/14 da v4 — App ANAC); consentida primeiro; recusa → ANAC pode suspender certificação (empresa/aeronave) e emitir compulsória; **somente leitura**; **somente o solicitante vê**; auditado notificado (exceto segredo de justiça).
4. **JUSTICA (segredo de justiça):** concessão `confidential=TRUE`; visível apenas ao admin autorizador + proprietários; **meta-eventos confidenciais** (não aparecem para os demais admins); auditado não notificado enquanto durar o segredo.
5. **Cessação:** toda concessão expira automaticamente (`expires_at`) ou é revogada; encerrado o acesso, o filtro volta cifrado.
6. **Execução às cegas (suporte):** para operações comuns de suporte (ex.: correção de cadastro), a concessão é escopada a um campo/operação — o admin executa sem navegar livremente pelo ledger do cliente.
7. **Chaves de dados por tenant** em envelope encryption (chave-mestra em secret manager); **nenhum admin detém chaves de tenant**; a única via de descriptografia é o serviço de concessão.

### M3.5 Trilha de auditoria (serviço de consulta)

**Conceito:**
- A Trilha de Auditoria é uma **projeção de leitura** do Ledger — nunca um armazenamento duplicado.
- Qualquer tela de qualquer app consulta o histórico de uma entidade (`entity_name` + `entity_id`) via **LedgerTimeline**.
- A consulta valida a integridade da cadeia antes de retornar (hashes e assinaturas).
- O **conteúdo** (payload) só é descriptografado se o solicitante tiver concessão ativa cobrando aquele escopo — caso contrário, a timeline exibe apenas metadados (quem/papel, quando, ação, app de origem).

**Verificação de integridade:**

```sql
-- Função que verifica a cadeia a partir de um bloco inicial
CREATE OR REPLACE FUNCTION ledger.verify_chain(from_index BIGINT, to_index BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    prev_hash VARCHAR(64) := '';
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT block_index, previous_hash, current_hash, signature, public_key
        FROM ledger.ledger_blocks
        WHERE block_index BETWEEN from_index AND to_index
        ORDER BY block_index
    LOOP
        IF rec.previous_hash <> prev_hash THEN
            RETURN FALSE;  -- quebra de encadeamento
        END IF;
        -- (a verificação da assinatura Ed25519 é feita no serviço de aplicação)
        prev_hash := rec.current_hash;
    END LOOP;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Endpoints da trilha:**
- `GET /api/v1/ledger/entity/:entityName/:entityId` — histórico completo de uma entidade (metadados; conteúdo conforme concessão).
- `GET /api/v1/ledger/tenant/:tenantId` — eventos de um tenant (paginado).
- `GET /api/v1/ledger/block/:blockId` — detalhe de um bloco.
- `GET /api/v1/ledger/verify` — verificação de integridade da cadeia.
- `GET /api/v1/ledger/verify/range?from=&to=` — verificação de um intervalo.
- `POST /api/v1/ledger/access-grants` — criar concessão (com validação do tipo).
- `POST /api/v1/ledger/access-grants/:id/revoke` — revogar concessão.
- `GET /api/v1/ledger/access-grants` — listar concessões (console do Núcleo).
- `GET /api/v1/protocols` — listar protocolos.
- `GET /api/v1/protocols/:formattedProtocol` — detalhe de um protocolo.

### M3.6 Protocolo eletrônico (schema `protocol`)

```sql
-- SCHEMA: protocol
CREATE SCHEMA IF NOT EXISTS protocol;

CREATE TABLE protocol.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    sequence_number INT NOT NULL,
    formatted_protocol VARCHAR(20) NOT NULL UNIQUE, -- AAAA-NNNNNN (gerado pelo serviço)
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    entity_name VARCHAR(100),
    entity_id UUID,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_protocol_tenant ON protocol.protocols (tenant_id, created_at);
CREATE INDEX idx_protocol_entity ON protocol.protocols (entity_name, entity_id);
```

**Regras do protocolo:**
1. Numeração sequencial **por ano** no formato `AAAA-NNNNNN` (ex.: `2026-000001`).
2. A sequência reinicia a cada ano (o `sequence_number` é combinado com `protocol_year`).
3. Geração **atômica** (sem corrida): `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` sobre contador por ano.
4. Todo protocolo está **ancorado em um bloco do Ledger** (`ledger_block_id`) — o protocolo é a "capa" pública de um evento imutável.
5. Protocolo é imutável: correções geram novo protocolo vinculado ao anterior.
6. O protocolo é exibido em toda comunicação oficial e é a referência exigida nas concessões de suporte (SUPORTE_PROTOCOLO).

### M3.7 Continuidade: verificação e restauração (contrato 5-A.6)

1. **Job de verificação** a cada 6 horas (e sob demanda): valida hashes e assinaturas da cadeia; falha gera alerta CRITICAL/BLOCKING e identifica **exatamente onde** a cadeia rompeu.
2. **A cadeia detecta; o backup restaura:** o snapshot diário + WAL/PITR (infraestrutura — seção 2.9) devolve o conteúdo anterior à violação.
3. **Restauração reconciliada (anti-fraude):** restaurar backup NÃO pode apagar eventos já ocorridos. Procedimento:
   1. Restaurar o snapshot até o ponto anterior à violação.
   2. Revalidar os eventos posteriores ao ponto de restauração contra a cadeia de hashes (eventos íntegros são preservados; eventos corrompidos são descartados e re-emitidos pelos serviços de origem, se necessário).
   3. Gerar meta-evento `SYSTEM_RESTORED` no ledger (quem restaurou, quando, ponto de restauração, resultado da reconciliação).
4. **Teste de restauração** trimestral em ambiente isolado, com relatório.

### M3.8 Regras de negócio do Ledger (obrigatórias)

1. Nenhuma escrita de domínio é concluída sem gerar bloco no Ledger (regra 1 das 10 regras imutáveis).
2. UPDATE/DELETE no Ledger são bloqueados por trigger — qualquer tentativa gera exceção e log de segurança.
3. A verificação de integridade roda a cada 6 horas (job) e sob demanda; falha gera alerta CRITICAL/BLOCKING no Hub de Alertas.
4. Toda correção de um registro imutável é feita por **novo evento** (ex.: `WORK_ORDER_RECTIFIED`), nunca por edição do bloco original.
5. O protocolo é obrigatório para comunicações oficiais e processos regulatórios; sem protocolo, o evento não é "público".
6. A Trilha de Auditoria respeita RLS: usuário só vê eventos de tenants/empresas aos quais tem vínculo.
7. O payload é serializado em JSON canônico (chaves ordenadas) **antes** do hash e da cifra — hash determinístico.
8. A chave privada Ed25519 do ledger vive em secret manager (nunca em código ou `.env`).
9. As chaves de dados por tenant vivem no serviço de concessão — nunca nas mãos de administradores.
10. Todo acesso ao conteúdo descriptografado gera meta-evento (`ACCESS_VIEWED`) com quem, quando e escopo.

### M4 — Documentos e Assinatura (schemas `documents` e `signatures`)

**Princípios (IMUTÁVEIS):**
1. **Integridade:** todo documento tem hash SHA-256 calculado sobre o conteúdo; qualquer alteração quebra o hash.
2. **Autenticidade:** a assinatura vincula o documento ao signatário de forma verificável.
3. **Não repúdio:** a assinatura qualificada/avançada impede que o signatário negue a assinatura.
4. **Imutabilidade:** um documento assinado (selado) não pode ser alterado; mudanças geram nova versão.
5. **Rastreabilidade:** toda criação, versão, assinatura e download gera bloco no Ledger.
6. **Segurança:** arquivos nunca trafegam sem autenticação; downloads usam presigned URLs com expiração curta.
7. **Níveis de assinatura:** simples, avançada e qualificada (ICP-Brasil), conforme o requisito do documento.
8. **Tudo em texto:** documento, bloco de assinatura, QR (SVG) e logomarcas (SVG/base64) — nada binário persistido. PDF só sob demanda (efêmero).

```sql
-- SCHEMA: documents
CREATE SCHEMA IF NOT EXISTS documents;

CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID,
    user_id UUID NOT NULL,                        -- autor do documento
    origin_app VARCHAR(50) NOT NULL,              -- app de origem
    title VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,                -- APRS, OS, CIV, LAUDO, CONTRATO, PROCURACAO, CERTIFICADO, DECLARACAO_EXPERIENCIA, FORMULARIO_ANAC, OUTRO
    content_format VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN' CHECK (content_format IN ('MARKDOWN','XML')),
    storage_key VARCHAR(512) NOT NULL,            -- chave no MinIO (texto estruturado)
    sha256_hash VARCHAR(64) NOT NULL,             -- hash SHA-256 do conteúdo
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'text/markdown',
    version INT NOT NULL DEFAULT 1,
    is_sealed BOOLEAN NOT NULL DEFAULT FALSE,     -- selado = imutável (assinado)
    sealed_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    version INT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    change_reason VARCHAR(255),
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version)
);

-- SCHEMA: signatures
CREATE SCHEMA IF NOT EXISTS signatures;

CREATE TABLE signatures.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    signer_user_id UUID NOT NULL,
    signer_role VARCHAR(100) NOT NULL,            -- papel exibido no manifesto (ex.: Responsável Técnico)
    signer_company_id UUID,                       -- empresa exibida no manifesto
    signature_level VARCHAR(50) NOT NULL
      CHECK (signature_level IN ('SIMPLES','AVANCADA','QUALIFICADA_ICP')),
    signature_manifest JSONB NOT NULL,            -- metadados (data/hora Brasília, IP, dispositivo, contexto)
    digital_certificate_thumbprint VARCHAR(128),  -- impressão digital do certificado (ICP-Brasil)
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_hash VARCHAR(64) NOT NULL,
    verifier_code VARCHAR(20) NOT NULL UNIQUE,    -- código verificador (ID público da assinatura)
    crc_code VARCHAR(8) NOT NULL,                 -- CRC = 8 primeiros hex do sha256 do documento
    signature_block_svg TEXT,                     -- bloco de assinatura gerado (texto + QR SVG) — selado junto ao documento
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents.documents (tenant_id, created_at);
CREATE INDEX idx_documents_type ON documents.documents (doc_type, created_at);
CREATE INDEX idx_signatures_document ON signatures.signatures (document_id);
CREATE INDEX idx_signatures_signer ON signatures.signatures (signer_user_id);
CREATE INDEX idx_signatures_verifier ON signatures.signatures (verifier_code);
```

**M4.1 Níveis de assinatura (Lei 14.063/2020):**

| Nível | Uso recomendado | Mecanismo |
|-------|-----------------|-----------|
| **Simples** | Documentos internos, comunicados, confirmações de leitura | Identificação por login + aceite (registrado no ledger) |
| **Avançada** | Documentos operacionais (OS, APRS/CRS, contratos, procurações, declarações de experiência) | Assinatura com hash criptográfico + metadados de contexto (IP, dispositivo, sessão) — não repúdio |
| **Qualificada (ICP-Brasil)** | Documentos regulatórios de maior exigência (quando exigido) | Assinatura com certificado digital ICP-Brasil (e-CPF/e-CNPJ) |

**Regras dos níveis:**
1. O tipo de documento define o **nível mínimo** de assinatura exigido (configurável por domínio).
2. APRS/CRS, OS de manutenção, procurações, contratos e declarações de experiência exigem **no mínimo assinatura avançada**.
3. Documentos regulatórios que exigem certificado digital usam **qualificada ICP-Brasil**.
4. A assinatura simples é suficiente para comunicações internas e confirmações.
5. Toda assinatura gera bloco no Ledger (não repúdio).

**M4.2 Bloco de assinatura padrão SEI/ANAC (contrato seção 5-B):**

Composição (gerado no momento da assinatura, selado junto com o documento):

```
---
[LOGOMARCA SVG/base64]

Documento assinado eletronicamente por [NOME COMPLETO], [PAPEL/CARGO], [EMPRESA],
em [DD/MM/AAAA] às [HH:MM], conforme horário oficial de Brasília, com fundamento
no art. 4º do Decreto nº 10.543, de 13 de novembro de 2020.

A autenticidade deste documento pode ser conferida em
https://[domínio]/ass/autenticidade, informando o código verificador [VERIFIER_CODE]
e o código CRC [CRC_CODE].

[QR CODE — SVG, apontando para /ass/autenticidade?code=VERIFIER_CODE&crc=CRC_CODE]
---
```

**Regras do bloco:**
1. **QR code em SVG** (fallback base64 PNG para consumidores que não renderizam SVG) — aponta para a página pública de autenticidade.
2. **Manifesto textual gerado do Ledger** — nunca digitado à mão: nome, papel, empresa, data/hora de Brasília, fundamento legal.
3. **Códigos:** `verifier_code` = ID público da assinatura; `crc_code` = **8 primeiros hex do sha256_hash do documento** (conferência rápida sem expor o hash completo).
4. **Múltiplos signatários:** um bloco por signatário, em ordem cronológica de assinatura.
5. **Texto e QR são dois renderizadores da mesma verdade** (dados do ledger) — divergência invalida a verificação.
6. O bloco é gerado no momento da assinatura e **selado junto com o documento** (`signature_block_svg` persistido; não se regenera).
7. Os 3 níveis de assinatura usam o mesmo bloco, com o fundamento legal correspondente.

**M4.3 Página pública de autenticidade (`/ass/autenticidade`):**
- **Acesso público** (nível PUBLIC — o único conteúdo público do sistema).
- Entrada: código verificador + CRC (ou QR escaneado).
- Saída: confirmação de autenticidade, signatário (nome/papel/empresa), data/hora de assinatura, integridade verificada — **sem expor o conteúdo do documento**.
- Consulta identificável gera meta-evento no ledger (quem verificou, quando).

**M4.4 Gerenciador de arquivos (MinIO):**

**Conceito:**
- Arquivos físicos vivem no **MinIO**; o banco guarda `storage_key`, hash e metadados.
- Uploads e downloads usam **presigned URLs** (expiração curta: 15 min upload, 5 min download).
- Versionamento: cada alteração gera nova versão (append-only no histórico de versões).
- **MinIO com versionamento de bucket + replicação offsite** (contrato 5-A.6).

**Fluxo de upload:**
1. Cliente solicita presigned URL de upload (`POST /api/v1/documents/presign-upload`).
2. Cliente envia o arquivo diretamente ao MinIO.
3. Serviço calcula o hash SHA-256 e registra o documento no banco.
4. Gera bloco no Ledger (`DOCUMENT_CREATED`, com `origin_app`).

**Fluxo de download:**
1. Cliente solicita presigned URL de download (`GET /api/v1/documents/:id/presign-download`).
2. Serviço valida permissão (RLS) e gera URL com expiração curta.
3. Cliente baixa o arquivo diretamente do MinIO.

**Regras do gerenciador:**
1. Restrição de tipos MIME e tamanho máximo (configurável por domínio).
2. Hash SHA-256 obrigatório em todo arquivo (integridade).
3. Arquivo selado (assinado) não pode ser substituído; nova versão é criada.
4. Presigned URLs com expiração curta e escopo restrito.
5. Todo upload, download e versão gera bloco no Ledger.
6. **Documentos de Publicações** (manuais licenciados) têm controle de acesso adicional: o recorte só é servido a assinantes (Parte 14 — Publicações).

**M4.5 Compliance LGPD:**

```sql
-- SCHEMA: compliance
CREATE SCHEMA IF NOT EXISTS compliance;

CREATE TABLE compliance.consent_purposes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose_code VARCHAR(50) NOT NULL UNIQUE,   -- ex.: RECRUTAMENTO, MARKETING, COMPARTILHAMENTO_PERFIL
    description VARCHAR(500) NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,           -- CONSENTIMENTO, OBRIGACAO_LEGAL, EXECUCAO_CONTRATO...
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE compliance.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    purpose_id UUID NOT NULL REFERENCES compliance.consent_purposes(id),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    consent_proof JSONB NOT NULL,               -- contexto da coleta (IP, dispositivo, versão do texto)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compliance.data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('EXPORT','ERASE')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','EM_PROCESSAMENTO','CONCLUIDO','PARCIAL','REJEITADO')),
    retention_justification JSONB,              -- dados retidos por obrigação regulatória (quando PARCIAL)
    result_storage_key VARCHAR(512),            -- export: arquivo no MinIO (download autenticado)
    protocol_id UUID,                           -- protocolo do pedido
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

**Regras LGPD:**
1. **Consentimento revogável por finalidade:** o usuário concede/revoga cada finalidade independentemente (Rconta → Módulo Segurança/Privacidade); a revogação é imediata para finalidades de consentimento e gera bloco no ledger.
2. **Export (portabilidade):** `POST /compliance/export` → gera arquivo estruturado (JSON/Markdown) com todos os dados do usuário (cadastros, currículo, CIV, documentos, histórico do ledger de que é dono) → download autenticado via presigned URL → protocolo emitido.
3. **Erase (esquecimento) com ressalva regulatória:** `POST /compliance/erase` → apaga dados pessoais não sujeitos a retenção legal; **dados com retenção regulatória (caderneta, registros de manutenção, SGSO, fiscal — docs/02 §2) NÃO são apagados**: são anonimizados (identificadores pessoais removidos) e o pedido retorna `PARCIAL` com a justificativa de retenção por norma.
4. O erase **nunca** quebra a cadeia do ledger: os blocos permanecem (imutáveis), com o payload anonimizado **por novo evento** (`PERSONAL_DATA_ERASED`) — o dado original fica cifrado e inacessível (chave de acesso revogada), preservando a cadeia.
5. Todo pedido de export/erase tem **protocolo** e gera blocos no ledger.
6. Prazo de atendimento: 15 dias (LGPD, art. 19).

**Endpoints de compliance:**
- `GET /api/v1/compliance/consents` — finalidades e estado do consentimento do usuário.
- `POST /api/v1/compliance/consents/:purposeId` — conceder/revogar consentimento.
- `POST /api/v1/compliance/export` — solicitar portabilidade.
- `POST /api/v1/compliance/erase` — solicitar esquecimento.
- `GET /api/v1/compliance/requests/:id` — acompanhar pedido.

**M4.6 Endpoints de documentos e assinaturas:**

*Documentos:*
- `POST /api/v1/documents` — criar documento (metadados).
- `POST /api/v1/documents/presign-upload` — solicitar URL de upload.
- `GET /api/v1/documents/:id` — detalhe do documento.
- `GET /api/v1/documents/:id/presign-download` — solicitar URL de download.
- `POST /api/v1/documents/:id/versions` — criar nova versão.
- `GET /api/v1/documents/:id/versions` — listar versões.
- `POST /api/v1/documents/:id/seal` — selar documento (tornar imutável).
- `GET /api/v1/documents` — listar documentos (filtros por tipo/tenant).

*Assinaturas:*
- `POST /api/v1/signatures` — assinar documento (nível especificado; gera bloco SEI).
- `GET /api/v1/signatures/document/:documentId` — assinaturas de um documento.
- `GET /api/v1/signatures/user/:userId` — assinaturas de um usuário.
- `POST /api/v1/signatures/:id/verify` — verificar validade e integridade de uma assinatura.
- `GET /ass/autenticidade?code=&crc=` — **pública** — confirmação de autenticidade.

**M4.7 Regras de negócio de documentos/assinatura (obrigatórias):**
1. Documento sem hash válido não pode ser assinado.
2. Documento selado (`is_sealed = TRUE`) não aceita novas versões nem alterações.
3. A assinatura exige que o signatário tenha vínculo/permissão ao documento (RLS).
4. A assinatura qualificada exige certificado ICP-Brasil válido (validação do thumbprint).
5. Toda assinatura gera bloco no Ledger com o `signature_hash`.
6. A verificação de assinatura valida o hash do documento, o hash da assinatura e (quando ICP) o certificado.
7. Documentos de pessoas (CIV, CMA, certificados, procurações, declarações) são ancorados no perfil no núcleo.
8. O download de documento exige permissão e gera bloco no Ledger (`DOCUMENT_DOWNLOADED`).
9. **O bloco de assinatura é gerado do ledger e selado com o documento** — nunca regenerado.
10. **Consentimento revogado suspende imediatamente o tratamento da finalidade** (exceto obrigações legais).

### M5 — Billing e Subscriptions (schema `subscriptions`)

**Modelo de negócio do ecossistema (produtos vendidos e não vendidos):**

| Produto/App | Modelo | Observação |
|-------------|--------|------------|
| **Rconta (grátis)** | Grátis com anúncios (banners) | 7 módulos + 2 menus; banners removidos com Rconta VIP ou compra de um ERP |
| **Rconta VIP** | Assinatura | Remove anúncios apenas na Rconta de quem comprou |
| **Assinatura de Vagas** | Assinatura | Recrutamento para empresa **sem ERP** |
| **ERP Manutenção (43/145)** | Assinatura | Recrutamento incluso |
| **ERP Operadores (91/121/135)** | Assinatura | Recrutamento incluso |
| **ERP Cursos (141/142 + ISs)** | Assinatura | Recrutamento incluso; único que vende cursos na RLoja |
| **ERP Agrícola (137)** | Assinatura | Recrutamento incluso |
| **ERP Aeródromos (153)** | Assinatura | Recrutamento incluso |
| **Publicações** | Assinatura anual | Manuais digitalizados licenciados; recortes consumidos pelas tarefas de manutenção dos ERPs |
| **RLoja** | Comissão 3% do vendedor | Comprador isento; vender não exige assinatura (multi-vendor) |
| **Travel** | Comissão de agência | Passagens de linhas regulares 121 |
| **Fretamento** | Comissão/contrato | 135 (passageiros, carga, aeromédico) e 137 (agrícola) |
| **Núcleo / Catálogo / App ANAC** | Não vendidos | Infraestrutura e uso oficial |

> **RECRUTAMENTO NÃO É PRODUTO E NÃO TEM COMISSÃO:** o uso vem **embutido na assinatura de todo ERP** (permissão `recrutamento:incluso`); empresa sem ERP compra a **Assinatura de Vagas**; **pessoas nunca pagam**; nenhuma cobrança por evento de contratação.

**Regras de comissão (acionadas por eventos do ledger):**

| Fonte | Regra | Onde é acionado |
|-------|-------|-----------------|
| Marketplace (RLoja) | 3% da venda, cobrado do VENDEDOR; comprador isento | Quando uma venda é concluída na RLoja |
| Travel | Comissão de agência por passagem 121 (percentual por companhia, configurável) | Quando o e-ticket é emitido |
| Fretamento | Comissão/contrato por fretamento 135/137 (percentual ou taxa por operação) | Quando o contrato de fretamento é confirmado |
| ~~Recrutamento~~ | ~~3% do primeiro salário, garantia 90 dias~~ | **REMOVIDA** — sem comissão; sem cobrança por contratação |

> **Nota de arquitetura:** as comissões são acionadas por **eventos do ledger** (venda concluída, e-ticket emitido, contrato confirmado). Os apps não calculam nem cobram — apenas o evento dispara o billing.

**Planos de assinatura:**

| Plano | Limites |
|-------|---------|
| **STARTER** | 1 empresa, 5 usuários, ledger+protocolo básico, 1GB |
| **PRO** | Múltiplos módulos, 50 usuários, assinatura digital, 10GB |
| **ENTERPRISE** | Ilimitado, auditoria certificada, API, white-label |

```sql
-- SCHEMA: subscriptions
CREATE TABLE subscriptions.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ERP','RH','CRM','LOJA','OPERADORES','MANUTENCAO','INSTRUCAO','AGRICOLA','AERODROMO','CERTIFICACOES','PUBLICACOES','TRAVEL','FRETAMENTO')),
    owner_company_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.tenant_users (
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','USER')),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE subscriptions.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    product VARCHAR(50) NOT NULL CHECK (product IN
      ('RCONTA_VIP','ASSINATURA_VAGAS','ERP_MANUTENCAO','ERP_OPERADORES','ERP_CURSOS','ERP_AGRICOLA','ERP_AERODROMOS','PUBLICACOES')),
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('STARTER','PRO','ENTERPRISE','ANUAL_PUBLICACOES')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renews_at TIMESTAMPTZ,
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY','ANNUAL')),
    includes_recruitment BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE para todos os ERPs
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions.subscriptions(id),
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED','REFUNDED')),
    due_date DATE NOT NULL,
    payment_reference VARCHAR(100),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(30) NOT NULL CHECK (source IN ('RLOJA','TRAVEL','CHARTER')),
    source_event_id UUID NOT NULL,          -- venda/e-ticket/contrato que disparou
    seller_user_id UUID,
    seller_company_id UUID,
    base_amount NUMERIC(15,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','COBRADA','CANCELADA')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Regras de billing:**
1. Tenant vinculado à empresa (não confundir tenant com empresa).
2. Medição correta de uso via ledger (eventos do ledger por tenant/mês).
3. Cobrança recorrente (mensal/anual) via Asaas (PIX/boleto/cartão); webhook idempotente.
4. Fatura vencida após 7 dias de tolerância → **suspensão** do módulo pago e **migração de custódia do estoque de volta à Rconta** (evento no ledger).
5. Cancelamento/suspensão de ERP → estoque volta à Rconta (módulo Empresarial) como estoque único com marcação de origem; ao regularizar, o sistema pergunta se quer restaurar os estoques como estavam antes.
6. Rconta VIP remove anúncios **apenas na Rconta do comprador**.
7. **Comissões:** RLoja 3% do vendedor; Travel comissão de agência; Fretamento comissão/contrato — todas acionadas por eventos do ledger e registradas em `subscriptions.commissions`.
8. **Recrutamento:** nenhuma cobrança por contratação; a assinatura de ERP carrega `includes_recruitment = TRUE`; a Assinatura de Vagas é produto próprio para quem não tem ERP.
9. **Publicações:** assinatura anual por pacote; o acesso ao recorte das tarefas de manutenção é verificado pela assinatura ativa (Parte 14 — Publicações).
10. **Suspensão de Publicações** → tarefas de manutenção abrem sem o recorte (orientação de obtenção externa) — sem bloquear a tarefa em si.

**Endpoints de billing:**
- `POST /subscriptions`
- `GET /subscriptions`
- `POST /subscriptions/:id/cancel`
- `POST /subscriptions/:id/reactivate`
- `POST /tenants`
- `POST /tenants/:id/users`
- `GET /subscriptions/usage`
- `POST /invoices/:id/retry`
- `GET /commissions` (console/admin)
- `POST /commissions/:id/charge`

**Endpoints do PPSP:**
- `POST /arso-personnel`
- `GET /arso-personnel`
- `POST /toxicological-exams`
- `GET /toxicological-exams`
- `GET /arso-personnel/expiring`
- `POST /arso-personnel/:id/random-test`

### M6 — Hub de Alertas Preditivos (schema `notifications`)

**Conceito:**
- Centraliza alertas automáticos de vencimento, bloqueio e conformidade de TODO o ecossistema.
- Alimenta os badges da Shell (sino de notificações) — **com push via WebSockets**.
- Dispara notificações in-app e e-mail transacional.
- **Opera sobre dados do núcleo e dos apps — nunca cria cadastro próprio.**

```sql
-- SCHEMA: notifications
CREATE TABLE notifications.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','LIDO','RESOLVIDO','EXPIRADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

**Alertas obrigatórios (todo o ecossistema):**

| Alerta | Severidade | Antecedência |
|--------|-----------|--------------|
| Credenciamento RBAC 183 vencendo | CRITICAL | 60 dias |
| Licença/CMA vencendo | CRITICAL | 30 dias |
| Exame toxicológico vencendo | CRITICAL | 15 dias |
| Item MEL vencendo | CRITICAL | 3 dias |
| Treinamento vencendo | WARNING | 30 dias |
| Aprovação operacional expirando | WARNING | 30 dias |
| Relatório ANAC vencendo | CRITICAL | 15 dias |
| Fatura vencida | BLOCKING | imediato |
| Aeronave bloqueada | CRITICAL | imediato |
| Ferramenta com calibração vencida | BLOCKING | imediato |
| Dispersor com calibração vencida | BLOCKING | imediato |
| Credencial de acesso vencida | BLOCKING | imediato |
| Checklist de manutenção atrasado | WARNING | imediato |
| Agente extintor abaixo do mínimo | CRITICAL | imediato |
| RWYCC rebaixado | CRITICAL | imediato |
| Vínculo de experiência pendente de aprovação | INFO | imediato |
| Documento cadastral pendente de validação | INFO | imediato |
| Anúncio da RLoja pendente de aprovação do Admin | INFO | imediato |
| Assinatura de ERP vencendo/suspensa | BLOCKING | 7 dias |
| **Assinatura de Publicações vencendo** | WARNING | 30 dias |
| **Quebra de integridade do ledger** | BLOCKING | imediato |
| **Concessão de acesso expirando** | INFO | 24 horas |

**Regras do hub:**
1. Varredura preditiva a cada 6 horas (job).
2. Alertas BLOCKING bloqueiam a ação correspondente.
3. Alertas alimentam os badges da Shell (sino) — push em tempo real via WebSockets.
4. Notificações in-app + e-mail transacional (idempotente por notification_key).
5. Toda criação/resolução de alerta → ledger.

**Endpoints do hub:**
- `GET /alerts`
- `GET /alerts/:id`
- `POST /alerts/:id/read`
- `POST /alerts/:id/resolve`
- `GET /alerts/summary` (badges da Shell)

### M7 — Motor de Regras Declarativo (BRE)

**Conceito:**
- Centraliza TODAS as regras de negócio do ecossistema (`regras-bre.ts` em `libs/shared-dto`).
- Consome os seeds por RBAC (docs/05) como fonte canônica.
- Nenhuma regra hardcoded — sempre lida dos seeds/configuração.

**Regras críticas a registrar no BRE:**
1. Credenciamento expirado (3 anos) → bloqueio automático + alerta 60 dias.
2. Licença/CMA/credenciamento vencido → bloqueio do profissional.
3. Exame toxicológico vencido (90 dias) → bloqueio da função ARSO.
4. Item MEL vencido → bloqueio do voo.
5. DA aplicável pendente → prevalece sobre a MEL.
6. Despacho bloqueado se faltar combustível regulamentar.
7. Ferramenta com calibração vencida → bloqueio de uso na OS.
8. Peça com etiqueta vermelha → bloqueio de instalação.
9. OS não aprovada para retorno sem assinatura de profissional habilitado.
10. Grande reparo/alteração → SEGVOO 001 antes do retorno.
11. Fluxo comercial da oficina em 12 etapas (máquina de estados, sem retroativos).
12. Matrícula de aeronave deve bater com o RAB.
13. Anúncio da RLoja é visão do estoque (sem item de estoque, sem anúncio).
14. Matrícula no dobro do período letivo → cancelamento (S141).
15. Tempo-resposta SESCINC ≤ 3 minutos.
16. **Vínculo de experiência só fica ATIVO com dupla confirmação (misto).**
17. **Vaga interna visível apenas para funcionário com vínculo ativo na empresa.**
18. **Contratação finalizada cria vínculo automático Núcleo ↔ RH do ERP — sem cobrança.**
19. **Recrutamento nunca cria cadastro próprio de pessoas — apenas agrega e edita perfil (origem no ledger).**
20. **Histórico exibido é sempre um filtro do ledger — nunca duplicado.**
21. **Cursos só podem ser anunciados pelo ERP de Cursos (Parte 09); publicações pela Parte 14 (Publicações).**
22. **Rconta grátis exibe banners; Rconta VIP ou compra de ERP remove apenas na Rconta do comprador.**
23. **Suspensão de ERP devolve o estoque à Rconta como estoque único com marcação de origem; regularização pode restaurar posições originais (itens vendidos não voltam).**
24. **Estoque criado na RLoja migra ao ERP ao contratar (RLOJA_TO_ERP).**
25. **Recorte de manual exige assinatura de Publicações ativa; sem assinatura, orientação de obtenção externa — tarefa nunca bloqueada.**
26. **Acesso ao ledger exige concessão ativa (5 tipos); auditor ANAC é somente-leitura; segredo de justiça esconde meta-eventos.**
27. **Movimento (pouso/decolagem) em RWYCC incompatível é bloqueado.**
28. **Currículo de IS (121-006 etc.) só é criado pelo ERP Cursos; operadores contratam turma corporativa.**

**Estrutura:**

```typescript
// libs/shared-dto/src/lib/rules/regras-bre.ts
export const BUSINESS_RULES = [
  { code: 'ACCREDITATION_EXPIRED', severity: 'BLOCKING' },
  { code: 'LICENSE_EXPIRED', severity: 'BLOCKING' },
  { code: 'TOXICOLOGICAL_EXPIRED', severity: 'BLOCKING' },
  { code: 'MEL_ITEM_EXPIRED', severity: 'BLOCKING' },
  { code: 'DA_PENDING', severity: 'BLOCKING' },
  { code: 'FUEL_INSUFFICIENT', severity: 'BLOCKING' },
  { code: 'TOOL_CALIBRATION_EXPIRED', severity: 'BLOCKING' },
  { code: 'PART_RED_TAG', severity: 'BLOCKING' },
  { code: 'CRS_WITHOUT_SIGNATURE', severity: 'BLOCKING' },
  { code: 'SEGVOO_REQUIRED', severity: 'BLOCKING' },
  { code: 'AIRCRAFT_RAB_MISMATCH', severity: 'BLOCKING' },
  { code: 'LISTING_WITHOUT_INVENTORY', severity: 'BLOCKING' },
  { code: 'ENROLLMENT_DOUBLE_PERIOD', severity: 'BLOCKING' },
  { code: 'SESCINC_RESPONSE_OVER_LIMIT', severity: 'CRITICAL' },
  { code: 'RWYCC_OPERATION_INCOMPATIBLE', severity: 'BLOCKING' },
  { code: 'EXPERIENCE_LINK_PENDING_DUAL_CONFIRM', severity: 'INFO' },
  { code: 'INTERNAL_JOB_VISIBILITY_RESTRICTED', severity: 'BLOCKING' },
  { code: 'HIRING_CREATES_AUTOMATIC_LINK', severity: 'INFO' },
  { code: 'RECRUITMENT_AGGREGATOR_ONLY', severity: 'BLOCKING' },
  { code: 'COURSE_SALES_ERP_TRAINING_ONLY', severity: 'BLOCKING' },
  { code: 'PUBLICATION_LICENSE_REQUIRED', severity: 'BLOCKING' },
  { code: 'EXCERPT_REQUIRES_PUBLICATION_SUBSCRIPTION', severity: 'BLOCKING' },
  { code: 'BANNERS_RCONTA_FREE', severity: 'INFO' },
  { code: 'STOCK_CUSTODY_RETURN_ON_SUSPENSION', severity: 'BLOCKING' },
  { code: 'STOCK_RLOJA_TO_ERP_ON_CONTRACT', severity: 'INFO' },
  { code: 'LEDGER_ACCESS_REQUIRES_GRANT', severity: 'BLOCKING' },
  { code: 'ANAC_AUDITOR_READ_ONLY', severity: 'BLOCKING' }
];
```

### M8 — Integrações externas

**M8.1 Links oficiais ANAC (referência):**

| Recurso | Link |
|---------|------|
| RAB (Registro Aeronáutico Brasileiro) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp |
| Consulta de matrícula (exemplo PP-EPT) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp?tipo_pesquisa=marcas&textMarca=PP-EPT |
| Sistema Eletrônico de Informações (SEI) | https://sei.anac.gov.br |
| Portal ANAC | https://www.gov.br/anac |
| S141 (centros de instrução) | https://s141.anac.gov.br |

**M8.2 Validação RAB (regra do cadastro de aeronave):**
- No cadastro de aeronave, o sistema confronta a matrícula com a base pública do RAB.
- Valida se o operador/proprietário cadastrado coincide com o titular no RAB (nome + CPF/CNPJ).
- Matrícula NÃO no nome da pessoa/empresa → cadastro bloqueado (`AIRCRAFT_RAB_MISMATCH`).
- Matrícula com um dos proprietários ou operadores = nome e CPF/CNPJ do Núcleo → cadastro liberado.
- Fonte: RAB via scraping (sem API oficial) — **circuit breaker**: RAB indisponível → cadastro pendente de validação (nunca bloqueado para sempre).

**M8.3 Integrações de validação cadastral (N2 — fonte oficial):**

> As integrações abaixo elevam o nível de validação dos dados cadastrais e profissionais para **N2 (selo oficial 🟢)**. Nunca bloqueiam o fluxo.

| Integração | Dado validado | Nível |
|------------|---------------|-------|
| Gov.br | Identidade do usuário | N2 |
| Receita Federal | CPF / CNPJ | N2 |
| Correios (ViaCEP) | CEP / endereço | N2 |
| RAB (ANAC) | Matrícula / proprietário / operador | N2 |
| SACI (ANAC) | CMA | N2 |

**M8.4 Integrações de infraestrutura:**
- **Asaas** (pagamentos): PIX, boleto, cartão; cobrança recorrente; webhook idempotente.
- **Resend** (e-mail transacional): templates, bounce.
- **Sentry** (erros): monitoramento.
- **GitGuardian** (segredos): prevenção de vazamento.

**M8.5 Regras de integração:**
1. Secrets NUNCA em claro (env/secret manager).
2. Webhooks idempotentes (não duplicam).
3. Toda integração externa registra no ledger.
4. Falha de integração não derruba o fluxo principal (circuit breaker).
5. Integrações de validação elevam o selo (N2) — nunca bloqueiam o fluxo.

### M9 — Central de Comunicação (barra superior da Shell)

1. **Chat:** conversas entre usuários da mesma empresa/tenant e conversas do processo seletivo — **tempo real via WebSockets** (mensagens em `communication.messages`; cada mensagem gera bloco no ledger).
2. **Alertas:** consome `notifications.alerts` (badges do Hub Preditivo) — push WebSocket.
3. **E-mails:** caixa de e-mails transacionais (entrada/saída via Resend).
4. **Comunicados Oficiais:** avisos da plataforma e da empresa (target por tenant/empresa/papel).
5. **Tema:** alterna claro → escuro → personalizado.
- Toda conversa/comunicado relevante gera bloco no Ledger; a Central apenas exibe filtros (sem duplicar histórico).
- Schema: `communication` (threads, mensagens, participantes, comunicados).

### M10 — Console do Núcleo (gestão zero-trust — contrato seção 5-A e docs/10 §1)

**M1.10.1 Princípio:**

> **O console vê estados e métricas, nunca conteúdo.** Toda ação exige protocolo e vira meta-evento. Nenhum administrador detém chaves de tenant. O console é a materialização do "administrar sem ver".

**M1.10.2 Módulos do console:**

| Módulo | O que vê | O que NUNCA vê |
|--------|----------|----------------|
| **Dashboard** | KPIs de plataforma: tenants ativos, apps, integridade do ledger, fila de concessões | Conteúdo de tenants |
| **Tenants** | Estados, assinaturas, métricas de uso | Dados cadastrais, financeiro, estoque dos tenants |
| **Concessões de acesso** | Lista com tipo (DONO/SUPORTE_PROTOCOLO/AUDITORIA_CONSENTIDA/AUDITORIA_COMPULSORIA/JUSTICA), escopo, validade, status | O conteúdo concedido |
| **Nova concessão por protocolo** | Form: nº do protocolo + escopo mínimo → execução às cegas | Conteúdo além do escopo |
| **Revisão de descriptografias** | Relatório de meta-eventos: quem, escopo, protocolo, quando | O conteúdo descriptografado |
| **Integridade do ledger** | Status da cadeia, verificação por intervalo, relatório de quebras | Conteúdo dos blocos |
| **Catálogo** | Itens, deduplicação, taxonomia ATA | Estoque/financeiro dos tenants |
| **Auditoria da plataforma** | Timeline de meta-eventos | Conteúdo |
| **Restaurações** | Histórico SYSTEM_RESTORED, nova restauração reconciliada | Conteúdo |
| **Configuração** | Papéis de admin, parâmetros da plataforma | — |

**M1.10.3 Execução às cegas (suporte por protocolo):**
1. O dono do dado solicita suporte → **protocolo** emitido com a descrição do problema.
2. O administrador abre o protocolo no console → informa o nº → sistema valida que o protocolo existe, pertence ao tenant e descreve a operação.
3. Concessão `SUPORTE_PROTOCOLO` criada com **escopo mínimo** (entidade + operação/campo) e expiração curta.
4. O admin executa a operação **por formulário escopado** (não navega pelo ledger do cliente) — ex.: correção de nome por decisão judicial.
5. A operação gera evento no ledger (com `origin_app = NUCLEO`) + meta-eventos de concessão; o dono é notificado.
6. Os **proprietários do VORTEX** revisam o relatório mensal de todas as descriptografias administrativas: "por que você acessou? por que não foi pelo protocolo do sistema?". Acesso sem justificativa de protocolo é falta grave.

**M1.10.4 Endpoints do console:**
- `GET /nucleo/dashboard` — KPIs de plataforma.
- `GET /nucleo/tenants` / `GET /nucleo/tenants/:id` — estados e métricas (sem conteúdo).
- `POST /nucleo/access-grants` — criar concessão (validação por tipo; protocolo obrigatório para SUPORTE_PROTOCOLO).
- `POST /nucleo/access-grants/:id/revoke` — revogar.
- `GET /nucleo/access-grants` — listar concessões.
- `GET /nucleo/descriptions-report` — relatório de descriptografias (meta-eventos).
- `GET /nucleo/ledger-integrity` / `POST /nucleo/ledger-integrity/verify` — integridade da cadeia.
- `GET /nucleo/catalog` / `POST /nucleo/catalog/dedup` — catálogo e deduplicação.
- `GET /nucleo/audit-timeline` — timeline de meta-eventos da plataforma.
- `POST /nucleo/restorations` — iniciar restauração reconciliada.
- `GET /nucleo/restorations` — histórico SYSTEM_RESTORED.

**M1.10.5 Frontend Angular do console (`feature-nucleo`):**
- Layout distinto (sala de máquinas): sidebar de módulos, sem Central de Comunicação de tenant.
- Cada módulo exibe **estados/métricas** (tabelas, contadores, gráficos) — nenhum componente de conteúdo de tenant.
- **Fluxo de concessão por protocolo:** form → validação → execução às cegas (formulário escopado à operação) → confirmação com meta-evento exibido.
- **LedgerTimeline** disponível apenas para meta-eventos da plataforma (nunca para conteúdo de tenant).
- Padrões obrigatórios: standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; guards de papel (admin da plataforma) no frontend + validação no backend.

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (síntese transversal do Núcleo)

1. **Escrita multi-app:** toda tabela do núcleo aceita escrita de **qualquer app autorizado** via API do núcleo — a autorização é por permissão (RBAC/ABAC), não por app. Toda escrita registra **`origin_app`** no evento do ledger (RCONTA, RECRUTAMENTO, RLOJA, ERP_*, TRAVEL, CHARTER, CERTIFICACOES, PUBLICACOES, ANAC, NUCLEO). Nenhum app mantém tabela própria de pessoas/produtos/vagas/currículos — a verificação é critério de aceite desta parte.
2. **Ledger:** nenhuma escrita de domínio é concluída sem gerar bloco; UPDATE/DELETE bloqueados por trigger; correção = novo evento; verificação a cada 6h; falha = alerta BLOCKING + restauração reconciliada.
3. **Acesso ao conteúdo:** somente sob concessão ativa (5 tipos); chaves de tenant nunca nas mãos de admins; toda descriptografia gera meta-evento e notifica o dono (exceto segredo de justiça).
4. **Protocolo:** obrigatório para comunicações oficiais e processos regulatórios; formato `AAAA-NNNNNN`; geração atômica; ancorado no ledger.
5. **Documentos/assinatura:** hash obrigatório; selado é imutável; níveis de assinatura conforme o tipo de documento; bloco SEI gerado do ledger e selado com o documento.
6. **LGPD:** consentimento revogável por finalidade; export com protocolo; erase com anonimização dos dados retidos por norma — nunca quebra a cadeia do ledger.
7. **Billing:** comissões acionadas por eventos do ledger; recrutamento sem comissão; fatura vencida (7 dias) suspende módulo e devolve custódia do estoque à Rconta.
8. **Alertas:** varredura a cada 6h; BLOCKING bloqueia a ação; push WebSocket; toda criação/resolução → ledger.
9. **BRE:** nenhuma regra hardcoded; seeds por RBAC como fonte canônica; regras BLOCKING bloqueiam a ação correspondente.
10. **Integrações:** webhooks idempotentes; circuit breaker (falha não derruba o fluxo); validação N2 eleva selo sem bloquear; toda integração registra no ledger.
11. **Console:** vê estados/métricas, nunca conteúdo; toda ação vira meta-evento; execução às cegas por protocolo; revisão mensal das descriptografias pelos proprietários.

## 7. ENDPOINTS DA API (resumo consolidado)

- **Ledger/Trilha:** `GET /api/v1/ledger/entity/:entityName/:entityId` · `GET /api/v1/ledger/tenant/:tenantId` · `GET /api/v1/ledger/block/:blockId` · `GET /api/v1/ledger/verify` · `GET /api/v1/ledger/verify/range` · `POST /api/v1/ledger/access-grants` · `POST /api/v1/ledger/access-grants/:id/revoke` · `GET /api/v1/ledger/access-grants`
- **Protocolo:** `GET /api/v1/protocols` · `GET /api/v1/protocols/:formattedProtocol`
- **Documentos:** `POST /api/v1/documents` · `POST /api/v1/documents/presign-upload` · `GET /api/v1/documents/:id` · `GET /api/v1/documents/:id/presign-download` · `POST /api/v1/documents/:id/versions` · `GET /api/v1/documents/:id/versions` · `POST /api/v1/documents/:id/seal` · `GET /api/v1/documents`
- **Assinaturas:** `POST /api/v1/signatures` · `GET /api/v1/signatures/document/:documentId` · `GET /api/v1/signatures/user/:userId` · `POST /api/v1/signatures/:id/verify` · `GET /ass/autenticidade?code=&crc=` (pública)
- **Compliance:** `GET /api/v1/compliance/consents` · `POST /api/v1/compliance/consents/:purposeId` · `POST /api/v1/compliance/export` · `POST /api/v1/compliance/erase` · `GET /api/v1/compliance/requests/:id`
- **Billing:** `POST /subscriptions` · `GET /subscriptions` · `POST /subscriptions/:id/cancel` · `POST /subscriptions/:id/reactivate` · `POST /tenants` · `POST /tenants/:id/users` · `GET /subscriptions/usage` · `POST /invoices/:id/retry` · `GET /commissions` · `POST /commissions/:id/charge`
- **PPSP:** `POST /arso-personnel` · `GET /arso-personnel` · `POST /toxicological-exams` · `GET /toxicological-exams` · `GET /arso-personnel/expiring` · `POST /arso-personnel/:id/random-test`
- **Alertas:** `GET /alerts` · `GET /alerts/:id` · `POST /alerts/:id/read` · `POST /alerts/:id/resolve` · `GET /alerts/summary`
- **Console do Núcleo:** `GET /nucleo/dashboard` · `GET /nucleo/tenants` · `POST /nucleo/access-grants` · `POST /nucleo/access-grants/:id/revoke` · `GET /nucleo/access-grants` · `GET /nucleo/descriptions-report` · `GET /nucleo/ledger-integrity` · `POST /nucleo/ledger-integrity/verify` · `GET /nucleo/catalog` · `POST /nucleo/catalog/dedup` · `GET /nucleo/audit-timeline` · `POST /nucleo/restorations` · `GET /nucleo/restorations`
- **Saúde:** `GET /health` em cada serviço.

## 8. FRONTEND ANGULAR

### 8.1 Padrões obrigatórios (Angular v2 — aplicáveis a TODA feature-lib do Núcleo)

1. Componentes **standalone** com **signals** + **OnPush** — sem `NgModule`.
2. Injeção com **`inject()`** — construtor de DI proibido em código novo.
3. Controle de fluxo **`@if`/`@for`/`@switch`** — `*ngIf`/`*ngFor` proibidos em código novo.
4. `input()`/`output()` function-based; formulários reativos **tipados** (`NonNullableFormBuilder`).
5. Estado de componente com signals; estado complexo local com NgRx ComponentStore.
6. Chamadas HTTP via services com `inject(HttpClient)`; interceptors em `libs/core` (token, erro padrão `{success,data,error}`, idempotency-key).
7. Toda tela de escrita valida permissão no backend; guards/hides são UX.
8. Histórico sempre via **LedgerTimeline** (nunca lista editável).

### 8.2 Design System (`libs/ui` — sobre Angular Material)

**Tokens:**
- Cores: primária (azul aviação `#0B3D91`), neutras, semânticas (sucesso/erro/aviso/info).
- Tipografia, espaçamento 4px, raios (4/8/12/16), sombras — CSS variables + objetos TS (single source of truth).

**Componentes base:**
Button, Input, Select, Checkbox, Radio, Switch, Textarea, Badge, Card, Table (Material), Modal (Dialog), Drawer, Tabs, Accordion, Tooltip, Toast, Avatar, Skeleton, Pagination, EmptyState, Spinner — todos standalone + signals + OnPush.

**Componentes próprios VORTEX:**
- **ValidationBadge** — exibe o nível de validação: ⚪ N0 Pendente · 🟡 N1 Sistema · 🟢 N2 Oficial · 🔵 N3 Autêntico. Input: `level: 'N0'|'N1'|'N2'|'N3'`, `source?: string`.
- **LedgerTimeline** — linha do tempo imutável de uma entidade (filtro do ledger); somente-leitura; exibe quem/papel, início, fim, app de origem.
- **SeletorDeTema** — claro → escuro → personalizado (alterna a cada clique).
- **BannerAd** — exibido apenas para Rconta grátis (condição lida da assinatura no núcleo).

**Temas:** claro, escuro e personalizado (tamanho do texto, fonte, cor de fundo — módulo Personalização). White-label (logo/cores) para Enterprise.

### 8.3 Shell Angular (SPA única — Opção A)

**Conceito:**
- Um único app Angular (`vortex-web`) com 14 feature-libs carregadas por **lazy loading de rotas**.
- Subdomínios (`rconta.vortex.com`, `mro.vortex.com`, …) apontam para o mesmo bundle; o host resolve a rota inicial pelo subdomínio (APP_INITIALIZER lê `window.location.hostname` → rota base do app).
- Falha de carregamento de uma feature-lib exibe tela de erro isolada — não derruba a Shell.

**Estrutura global da Shell:**
- **Top bar:** logo (white-label Enterprise) · seletor de apps (13, filtrado por permissão) · **Central de Comunicação** (Chat `[WebSocket]` · Alertas `[badges]` · E-mails · Comunicados) · **Tema** (claro → escuro → personalizado, alterna a cada clique) · perfil/sessão.
- **Sidebar:** menus do app ativo, gerados por permissão (UX).
- **Padrão de detalhe:** abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.

**Contrato de navegação:**
- Cada feature-lib exporta sua `ROUTES` tipada (a partir de `shared-dto`).
- Guards de permissão (UX) + validação no backend (verdade).

**Caminho de migração (A → B → C):**

| Fase | Arquitetura | Quando |
|------|-------------|--------|
| **A (agora)** | SPA única, lazy loading por feature-lib | Construção inicial |
| **B** | Apps Angular separados por subdomínio (sem federation) | Se um app precisar de ciclo de release próprio |
| **C** | **Native Federation** (host + remotes) | White-label / escala de times — o destino, não o começo |

A conversão A→C é mecânica quando as regras de module boundaries são respeitadas: a feature-lib vira remote, o shell vira host, as rotas viram manifest de federation. **Nenhuma tela é reescrita.**

### 8.4 Feature-libs desta parte

- **`feature-nucleo`** — Console do Núcleo (ver M1.10.5): layout "sala de máquinas", estados/métricas, execução às cegas, LedgerTimeline apenas de meta-eventos da plataforma.
- **Central de Comunicação** — na Shell (top bar), servida pelo `communication-service` com WebSockets.

## 9. TESTES OBRIGATÓRIOS

### 9.1 Fundação e Cadastro Central

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
20. Teste de restauração de estoque: regularização pergunta e restaura posições originais; itens vendidos não voltam.
21. Teste de multi-app de escrita: currículo editado pela Rconta E pelo Recrutamento → mesmo cadastro no núcleo, `origin_app` diferente no ledger.
22. Teste de module boundaries: `feature-*` não se importam entre si (ESLint falha o build).
23. Teste de personalização: claro → escuro → personalizado alternando a cada clique.
24. Teste de segurança: troca de senha desconecta dispositivos; 2FA TOTP funcional.

### 9.2 Ledger, protocolo e acesso governado

25. Teste de imutabilidade: tentativa de UPDATE/DELETE em `ledger_blocks` é rejeitada (trigger).
26. Teste de encadeamento: alterar um bloco intermediário quebra a verificação da cadeia.
27. Teste de assinatura: bloco com assinatura inválida é detectado na verificação.
28. Teste de append: novo bloco referencia o `previous_hash` do último bloco.
29. Teste de hash sobre payload em claro: cifra não altera o `content_hash`.
30. Teste de cifra: payload em repouso é ilegível sem a chave de dados do tenant.
31. Teste de concessão DONO: dono lê o conteúdo; sem vínculo, sem acesso.
32. Teste de SUPORTE_PROTOCOLO: sem protocolo, concessão rejeitada; com protocolo, escopo mínimo e dono notificado.
33. Teste de AUDITORIA: consentida → acesso; recusa → suspensão registrada + compulsória possível; auditor somente-leitura; só o solicitante vê.
34. Teste de segredo de justiça: concessão confidential esconde meta-eventos dos demais admins; sem notificação ao auditado.
35. Teste de cessação: concessão expirada/revogada → conteúdo volta cifrado; meta-evento gerado.
36. Teste de meta-eventos: todo ciclo de acesso gera ACCESS_REQUESTED/GRANTED/VIEWED/EXPIRED/REVOKED.
37. Teste de protocolo: formato `AAAA-NNNNNN` correto; sequência reinicia por ano; geração atômica sem corrida.
38. Teste de ancoragem: todo protocolo tem `ledger_block_id` válido.
39. Teste de trilha: consulta de histórico retorna apenas eventos do tenant (RLS); conteúdo só com concessão.
40. Teste de verificação: `verify_chain` retorna TRUE para cadeia íntegra e FALSE para corrompida.
41. Teste de idempotência do ledger: o mesmo evento não gera bloco duplicado (Idempotency-Key).
42. Teste de não duplicação: nenhum app cria tabela de histórico paralela ao Ledger.
43. Teste de restauração reconciliada: eventos posteriores ao ponto de restauração são revalidados; `SYSTEM_RESTORED` gerado.

### 9.3 Documentos, assinatura e LGPD

44. Teste de integridade: alterar o conteúdo do arquivo quebra o hash e invalida a assinatura.
45. Teste de nível: documento que exige assinatura avançada rejeita assinatura simples.
46. Teste de selagem: documento selado não aceita nova versão.
47. Teste de versionamento: nova versão preserva o histórico anterior (append-only).
48. Teste de presigned URL: URL expirada é rejeitada; URL válida baixa o arquivo.
49. Teste de RLS de documentos: usuário sem vínculo não acessa documento de outro tenant.
50. Teste de não repúdio: assinatura avançada/qualificada registra signatário, data e contexto no ledger.
51. Teste de ICP-Brasil: assinatura qualificada exige certificado válido.
52. Teste de ancoragem de documentos: criação, versão, assinatura e download geram blocos no ledger.
53. Teste de idempotência de assinatura: assinar duas vezes o mesmo documento com a mesma chave não duplica.
54. **Teste do bloco SEI:** QR SVG válido; manifesto com nome/papel/empresa/data de Brasília/Decreto 10.543; verifier_code + crc_code corretos (8 hex do sha256).
55. **Teste da página pública:** /ass/autenticidade confirma com códigos válidos; rejeita inválidos; não expõe conteúdo.
56. **Teste de divergência:** manifesto alterado manualmente invalida a verificação (texto e QR são a mesma verdade).
57. **Teste de múltiplos signatários:** blocos em ordem cronológica; selados junto ao documento.
58. **Teste de consentimento:** revogação imediata suspende a finalidade; gera bloco no ledger.
59. **Teste de export:** arquivo contém todos os dados do usuário; download autenticado; protocolo emitido.
60. **Teste de erase parcial:** dados com retenção regulatória são anonimizados (não apagados); justificativa por norma retornada.
61. **Teste de erase vs ledger:** cadeia íntegra após erase (anonimização por novo evento, nunca edição).

### 9.4 Billing, PPSP, alertas, BRE, integrações e comunicação

62. Teste de billing: comissão de 3% da loja (vendedor); comprador isento.
63. Teste de comissões: Travel (e-ticket emitido) e Fretamento (contrato confirmado) geram comissão via evento do ledger.
64. Teste de planos: STARTER/PRO/ENTERPRISE com limites corretos.
65. Teste de medição: contagem de eventos do ledger por tenant/mês.
66. **Teste de recrutamento sem comissão:** contratação finalizada NÃO gera cobrança; assinatura de ERP carrega `includes_recruitment = TRUE`.
67. **Teste de Assinatura de Vagas:** empresa sem ERP compra e usa o Recrutamento; pessoas nunca pagam.
68. Teste de PPSP: exame toxicológico vencido (90 dias) bloqueia função ARSO.
69. Teste de sorteio: algoritmo de sorteio aleatório auditável e ancorado no ledger.
70. Teste de afastamento: resultado positivo bloqueia irrevogavelmente.
71. Teste de alertas: alerta de credenciamento dispara 60 dias antes.
72. Teste de badges: alertas alimentam o sino da Shell (push WebSocket).
73. Teste de idempotência de notificações: notificações não duplicam.
74. Teste de suspensão de ERP: fatura vencida suspende e migra o estoque de volta à Rconta.
75. Teste de Rconta VIP: remove anúncios apenas na Rconta do comprador.
76. **Teste de Publicações:** assinatura ativa libera recorte; suspensa → tarefa abre sem recorte (sem bloquear a tarefa).
77. Teste de BRE: cada regra bloqueia a ação correspondente.
78. Teste de validação RAB: matrícula divergente bloqueia o cadastro; RAB indisponível → pendente (circuit breaker).
79. Teste de integração N2: gov/receita/correios elevam o selo de validação (nunca bloqueiam).
80. Teste de webhook: idempotente não duplica.
81. Teste de circuit breaker: falha de integração não derruba o fluxo.
82. **Teste da Central de Comunicação:** chat em tempo real via WebSocket; mensagem gera bloco no ledger; badges alimentados pelo Hub.

### 9.5 Console do Núcleo

83. Teste do console: administrador comum NÃO vê conteúdo de tenants (apenas estados/métricas) — teste de RLS + RBAC.
84. Teste de concessão por protocolo: sem protocolo válido, concessão rejeitada; com protocolo, escopo mínimo e expiração curta.
85. Teste de execução às cegas: admin executa operação escopada sem navegar pelo ledger do cliente; dono notificado.
86. Teste de revisão: relatório de descriptografias acessível apenas aos proprietários; acesso sem justificativa de protocolo é sinalizado.
87. Teste de integridade pelo console: verificação da cadeia acessível; quebra gera alerta BLOCKING.
88. Teste de restauração pelo console: restauração reconciliada acessível; gera SYSTEM_RESTORED.
89. Teste de isolamento de UI: feature-nucleo não importa feature-libs de apps de domínio (module boundaries).

## 10. CRITÉRIOS DE ACEITE

- [ ] Workspace Nx com frontend SPA + backend NestJS; docker-compose sobe tudo; `/health` verde; `nx affected` no CI.
- [ ] Schemas PostgreSQL criados (identity, professional, stock, recruitment, ledger, protocol, documents, catalog, subscriptions, oauth, signatures, compliance, notifications, market, communication, accounting, mro, ops, training, agri, airport, travel, charter, anac, certifications, publications).
- [ ] Shell Angular (SPA única) com lazy loading das 14 feature-libs; subdomínio resolve a rota inicial.
- [ ] Module boundaries enforced (feature-libs isoladas; comunicação só via `libs/core`).
- [ ] Design System `libs/ui` com tokens, temas e **ValidationBadge** + **LedgerTimeline**.
- [ ] `libs/shared-dto` como fonte única de contratos (front + back).
- [ ] Núcleo operando: Cadastro Central (pessoas, empresas, vínculos, contatos, endereços, documentos) com escrita multi-app e `origin_app` no ledger.
- [ ] Módulo Pessoal: dados cadastrais completos com validação N0–N3.
- [ ] Módulo Profissional: currículo, CIV, CMA, certificados, **declarações de experiência** e **estoque pessoal**.
- [ ] Módulo Empresarial: responsáveis, procuradores, empresas vinculadas, documentos assinados, **1 estoque por empresa**, timeline da assinatura.
- [ ] Módulos Protocolo, Assinaturas, Personalização e Segurança implementados.
- [ ] Estoque com catálogo único, custódia ERP ↔ Rconta ↔ RLoja e fluxo de restauração.
- [ ] RLS habilitado e forçado; padrão de resposta global.
- [ ] Schema `ledger` com `ledger_blocks` (payload cifrado, metadados em claro), índices e trigger de imutabilidade.
- [ ] Schema `ledger.access_grants` com os 5 tipos de concessão + meta-eventos do ciclo de acesso.
- [ ] Cifra AES-256-GCM por tenant (envelope) com hash sobre payload em claro.
- [ ] Schema `protocol` com sequência anual atômica e formato `AAAA-NNNNNN`.
- [ ] Serviço `ledger-service` com append, hashing, assinatura Ed25519, cifra e verificação.
- [ ] Serviço de concessão (única via de descriptografia; chaves de tenant fora das mãos de admins).
- [ ] Trilha de Auditoria como projeção de leitura (metadados públicos; conteúdo conforme concessão), com RLS.
- [ ] Job de verificação a cada 6 horas + fluxo de restauração reconciliada (`SYSTEM_RESTORED`).
- [ ] Schemas `documents` e `signatures` criados com índices (incluindo `verifier_code`).
- [ ] Assinatura em 3 níveis (simples, avançada, qualificada ICP-Brasil) implementada.
- [ ] **Bloco de assinatura padrão SEI/ANAC** (QR SVG + manifesto do ledger) gerado e selado com o documento.
- [ ] **Página pública `/ass/autenticidade`** operando (confirma sem expor conteúdo).
- [ ] Hash SHA-256 e selagem de documentos implementados; versionamento append-only.
- [ ] Gerenciador de arquivos via MinIO com presigned URLs.
- [ ] **Compliance LGPD:** consentimento revogável por finalidade, export e erase (com anonimização de dados retidos por norma).
- [ ] Billing com planos, tenants, medição de uso e cobrança Asaas.
- [ ] Modelo de negócio: assinaturas (Rconta VIP, Assinatura de Vagas, 5 ERPs, Publicações) + comissões (RLoja 3%, Travel, Fretamento) acionadas por eventos do ledger.
- [ ] **Recrutamento sem comissão** — embutido no ERP (`includes_recruitment`) ou Assinatura de Vagas; sem cobrança por contratação.
- [ ] Módulo PPSP (RBAC 120) com ARSO, exames toxicológicos de 90 dias e sorteio aleatório; afastamento imediato por resultado positivo.
- [ ] Hub de Alertas Preditivos com severidades e antecedências (incluindo alertas de Publicações, integridade do ledger e concessões); push WebSocket.
- [ ] Motor de Regras Declarativo (BRE) centralizado com as regras do ecossistema (28 regras).
- [ ] Integrações ANAC (RAB, SEI, S141, SIGRA) e validação N2 (gov, Receita, Correios, SACI) com circuit breakers; validação RAB no cadastro de aeronave.
- [ ] Central de Comunicação com WebSockets.
- [ ] Console do Núcleo operando: tenants, concessões, revisão de descriptografias, integridade, catálogo, auditoria, restaurações — **vendo estados, nunca conteúdo**.
- [ ] Execução às cegas por protocolo funcionando (escopo mínimo, expiração, notificação do dono).
- [ ] Relatório de descriptografias revisável pelos proprietários.
- [ ] Frontend Angular conforme padrões v2 (standalone + signals + OnPush + `inject()` + `@if/@for`), com isolamento de UI garantido por module boundaries.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

| Módulo | Seções previstas |
|--------|------------------|
| **M1 Fundação** | M1.1 workspace Nx (apps/serviços/libs) · M1.2 module boundaries · M1.3 Shell Angular (Opção A, subdomínios, migração A→B→C) · M1.4 Design System @vortex/ui (tokens, componentes, temas) · M1.5 RBAC/ABAC/RLS · M1.6 segurança e observabilidade · M1.7 padrões obrigatórios Angular v2 |
| **M2 Cadastro Central** | M2.1 entidades base (tenants, users, companies, relationships) · M2.2 módulo pessoal (contatos, endereços, documentos, redes) · M2.3 módulo profissional (currículo, CIV, CMA, certificados, vínculos, declarações) · M2.4 módulo empresarial (company_bindings) · M2.5 estoque e custódia (catálogo único, bidirecional RLoja ↔ ERP, restauração) · M2.6 preferências, dispositivos e segurança · M2.7 PPSP/ARSO (RBAC 120) · M2.8 escrita multi-app (origin_app) |
| **M3 Ledger** | M3.1 entidades (`ledger_blocks`, índices, trigger de imutabilidade) · M3.2 cifragem (AES-256-GCM, envelope por tenant, hash sobre payload em claro) · M3.3 fluxo de escrita (append, Ed25519, bus) · M3.4 concessões (`access_grants`, 5 tipos, meta-eventos) · M3.5 trilha de auditoria (LedgerTimeline, `verify_chain`) · M3.6 protocolo AAAA-NNNNNN · M3.7 restauração reconciliada (SYSTEM_RESTORED) |
| **M4 Documentos/Assinatura** | M4.1 documentos e versões (hash, selagem) · M4.2 níveis de assinatura (Lei 14.063/2020) · M4.3 bloco SEI/ANAC (QR SVG + manifesto) · M4.4 página pública /ass/autenticidade · M4.5 MinIO (presigned URLs, versionamento) · M4.6 compliance LGPD (consentimento, export, erase) |
| **M5 Billing** | M5.1 tenants e assinaturas (8 produtos, planos) · M5.2 faturas e cobrança Asaas · M5.3 comissões por evento do ledger (RLoja/Travel/Fretamento) · M5.4 suspensão e custódia do estoque |
| **M6 Alertas** | M6.1 entidade `notifications.alerts` · M6.2 catálogo de alertas (severidades/antecedências) · M6.3 varredura preditiva 6h e push WebSocket |
| **M7 BRE** | M7.1 estrutura (`regras-bre.ts` em shared-dto) · M7.2 regras críticas (28) · M7.3 seeds por RBAC como fonte canônica |
| **M8 Integrações** | M8.1 validação RAB (circuit breaker) · M8.2 validação N2 (gov.br, Receita, Correios, SACI) · M8.3 infraestrutura (Asaas, Resend, Sentry, GitGuardian) · M8.4 regras de integração (idempotência, ledger, circuit breaker) |
| **M9 Comunicação** | M9.1 chat via WebSockets · M9.2 alertas/badges · M9.3 e-mails transacionais (Resend) · M9.4 comunicados oficiais |
| **M1.10 Console do Núcleo** | M1.10.1 princípio zero-trust · M1.10.2 módulos do console (dashboard, tenants, concessões, descriptografias, integridade, catálogo, auditoria, restaurações, configuração) · M1.10.3 execução às cegas por protocolo · M1.10.4 endpoints · M1.10.5 frontend `feature-nucleo` |

## 12. FONTES v2 (rastreabilidade)

| Capítulo desta parte | Fonte v2 |
|----------------------|----------|
| 1 (Objetivo), 2 (Aderência: princípio central, stack, 10 regras, workspace Nx, RBAC/ABAC/RLS, segurança, ledger 5-A resumido, continuidade 5-A.6/5-A.7) | parte-1.md §§1–8, 16–18 · CLAUDE.md v2 §§2, 3, 5-A.6, 5-A.7, 7, 8, 10 |
| 3 (Fundamentação regulatória) | parte-2.md §3 · parte-3.md §3 · parte-4.md §4.1 |
| 4 (Estrutura de menus: Shell, console do Núcleo, Rconta 7+2) | docs/10-navegacao-por-app.md §§0–2 · parte-1.md §9 |
| 5 — M1/M2 (Cadastro Central: entidades base, pessoal, profissional, CIV, CMA, vínculos, declarações, empresarial, estoque/custódia, preferências/segurança, PPSP) | parte-1.md §§8, 10–14 · parte-4.md §4.2–4.3 |
| 5 — M3 (Ledger: entidades, hash, escrita, princípios, concessões, trilha, protocolo, restauração, regras) | parte-2.md INTEIRA (§§1–11) |
| 5 — M4 (Documentos, assinatura, bloco SEI, /ass/autenticidade, MinIO, LGPD) | parte-3.md INTEIRA (§§1–12) · CLAUDE.md v2 §5-B |
| 5 — M5 (Billing: modelo de negócio, comissões, planos, entidades, regras) | parte-4.md §§2–3 |
| 5 — M6 (Hub de Alertas) | parte-4.md §5 |
| 5 — M7 (BRE) | parte-8.md §5 |
| 5 — M8 (Integrações: RAB, N2, infraestrutura) | parte-8.md §4 |
| 5 — M9 (Central de Comunicação) | parte-8.md §6 · CLAUDE.md v2 §5 |
| 5 — M1.10 (Console do Núcleo: princípio, módulos, execução às cegas, endpoints, frontend) | parte-10.md §3 (§§3.1–3.4) · parte-10.md §4.2 |
| 6 (Regras de negócio transversais) | parte-1.md §8.2 · parte-2.md §9 · parte-3.md §10 · parte-4.md §§3.2, 4.3, 5.4 · parte-8.md §§4.5, 5.2 · parte-10.md §3 |
| 7 (Endpoints) | parte-2.md §7.3 · parte-3.md §§8.3, 9 · parte-4.md §§3.3, 4.4, 5.5 · parte-10.md §§3.4 |
| 8 (Frontend Angular: padrões, Design System, Shell, migração A→B→C, feature-nucleo) | parte-1.md §§6, 7, 18 · CLAUDE.md v2 §§7, 9 · parte-10.md §4.2 |
| 9 (Testes) | parte-1.md §19 · parte-2.md §10 · parte-3.md §11 · parte-4.md §6 · parte-8.md §8 (itens de integração/comunicação) · parte-10.md §5 (itens do console) |
| 10 (Critérios de aceite) | parte-1.md §20 · parte-2.md §11 · parte-3.md §12 · parte-4.md §7 · parte-8.md §9 (itens de infraestrutura) · parte-10.md §6 (itens do console) |
| 11 (Mapa de módulos) | Síntese estrutural desta parte (nova na v3/v4 — sem conteúdo v2) |
