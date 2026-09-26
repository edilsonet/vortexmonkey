# VORTEX v4 — PARTE 03/14: RECRUTAMENTO (recruta.vortex.com — embutido no ERP / Assinatura de Vagas)

> **Origem v2:** conteúdo extraído VERBATIM da Parte 1 v2 (§15 — Recrutamento como agregador, 2 origens, sem comissão) e do CLAUDE.md v2 (seção 4.3). A v3 separa um app por parte; a fundação (workspace Nx, Shell, Design System, Núcleo) fica na Parte 01.
> **Consumo do Núcleo (Parte 01):** o Recrutamento NÃO possui cadastro próprio de pessoas/currículos — perfis vêm do Núcleo (e são editáveis pelo Recrutamento, com origem no ledger). Todo evento registra `origin_app = RECRUTAMENTO` no ledger.

> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em RH, processos seletivos, arquitetura enterprise multi-tenant e aviação civil regulada. Construa o RECRUTAMENTO conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 03

Entregar o **Recrutamento** — agregador de currículos + RH completo, **sem comissão** (decisão 10/09/2026):

1. **2 origens de vagas** — a vaga nasce no **RH de cada ERP** OU **direto no Recrutamento** (para quem não tem ERP); ambos espelham os dados do núcleo.
2. **RH completo** — cargo, função, salário, requisitos, objetivo e demais dados para anunciar uma vaga (tanto no ERP quanto no Recrutamento).
3. **Perfil profissional completo** — tudo que o módulo Profissional da Rconta faz (currículo, cursos, treinamentos, documentos, experiências) — mesmo cadastro no núcleo.
4. **Processo seletivo** — candidaturas com snapshot, etapas, comunicação, contratação automática.
5. **Declarações automáticas de experiência** — solicitáveis também pelo Recrutamento.
6. **Sem comissão** — embutido na assinatura de todo ERP, ou Assinatura de Vagas para quem não tem ERP. **Pessoas nunca pagam.**

## 2. ADERÊNCIA À ARQUITETURA CENTRAL (CLAUDE.md v2)

- **Princípio 1 (Núcleo dono da verdade):** o Recrutamento NÃO cria cadastro próprio de pessoa, curso ou certificado — lê e edita o perfil do núcleo (origem no ledger). O mesmo dado pode ser criado/editado por qualquer app autorizado (ex.: currículo pela Rconta OU pelo Recrutamento) — o que muda é apenas o campo **`origin_app`** no evento do ledger; o cadastro vive **uma única vez** no núcleo.
- **Princípio 2 (Ledger imutável):** o histórico exibido é SEMPRE um **filtro do ledger** (LedgerTimeline) — nunca duplicado.
- **Princípio 4 (Vínculo misto):** a contratação finalizada cria o **vínculo automático** entre a pessoa contratada e o RH do ERP correspondente (via `professional.work_experiences`) — **sem cobrança alguma**.
- **Seção 4.3 do contrato (RECRUTAMENTO — NOVO MODELO, sem comissão):**
  - **Nenhuma cobrança por evento.** Não existe comissão de contratação, garantia paga nem cobrança do candidato. **Pessoas nunca pagam.**
  - **Porta de entrada 1 — empresa com qualquer ERP:** o uso do Recrutamento vem **embutido na assinatura do ERP** (permissão `recrutamento:incluso`). Custo zero adicional.
  - **Porta de entrada 2 — empresa sem ERP:** compra a **Assinatura de Vagas** (produto próprio, sem ERP).
  - **Origem das vagas:** a vaga pode nascer **no RH do ERP** ou **direto no Recrutamento**. Ambos os caminhos apenas **espelham os dados do núcleo**.
  - **Recrutamento completo (decisão 12/09/2026):** permite tudo que o módulo Profissional da Rconta faz (currículo, cursos, treinamentos, documentos, experiências) **+ o setor de RH completo** (cargo, função, salário, requisitos, objetivo e demais dados para anunciar uma vaga) — tanto no ERP quanto no Recrutamento.
  - **Declarações automáticas de experiência (decisão 12/09/2026):** geradas pelo sistema a pedido do funcionário ou quando a empresa encerra o vínculo — é direito do trabalhador ter a declaração de que exerceu o cargo/função pelo período X. Documento estruturado, assinado e ancorado no ledger, gerado do histórico de vínculo do núcleo.
  - O evento de contratação finalizada continua criando o **vínculo automático Rconta ↔ RH do ERP** — mas **não dispara cobrança alguma**.
  - Vagas externas (públicas) e internas (só funcionários com vínculo ativo) mantidas.
- **10 regras imutáveis de engenharia:** toda escrita valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus; ledger append-only; tenant é contexto; frontend nunca valida regra de negócio; padrão de resposta `{ success, data, error }`; `Idempotency-Key` em rotas de escrita; RLS por linha; migrações SQL + testes; secrets em env/secret manager; toda entrega lista o que fez e o que NÃO fez.
- **Regras do BRE (Parte 01 — Núcleo) relacionadas:** `INTERNAL_JOB_VISIBILITY_RESTRICTED` (BLOCKING), `HIRING_CREATES_AUTOMATIC_LINK` (INFO), `RECRUITMENT_AGGREGATOR_ONLY` (BLOCKING).

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Resolução ANAC nº 458/2017** — registros eletrônicos imutáveis (todo evento do processo seletivo gera bloco no ledger).
- **Lei nº 14.063/2020** — assinaturas eletrônicas (declarações de experiência assinadas; bloco SEI — Parte 01 (Núcleo — M4)).
- **LGPD (Lei nº 13.709/2018)** — dados de candidatos tratados com consentimento; snapshot do perfil capturado na candidatura preserva integridade histórica; export/erase conforme Parte 01 (Núcleo — M4, compliance).
- **RBAC 61/63/65** — licenças e habilitações (CHT, CANAC, habilitações) exibidas no perfil do candidato via Núcleo, com ValidationBadge N0–N3.
- **RBAC 67** — CMA do candidato exibido via Núcleo (validade/classe visíveis ao RH).

## 4. ESTRUTURA DE MENUS (docs/10 — nível de clique)

- Dashboard `[KPIs: vagas abertas, candidatos por estágio, tempo médio]`
- **Vagas** `[lista/kanban]` — Externas | Internas
  - Criar/editar vaga `[form completo de RH: cargo, função, salário, requisitos, objetivo, escala, visibilidade]` (origem: aqui OU no RH do ERP)
- **Candidatos** `[kanban por estágio → detalhe]`
  - Detalhe do candidato `[perfil (núcleo) + comparação de habilidades + estágio + [timeline]]`
- **Perfil profissional** (tudo que o Profissional da Rconta faz — mesmo cadastro no núcleo)
  - Currículo: Cursos `[lista → form]` · Treinamentos `[lista → form]` · Documentos `[lista → form]` · Experiências `[lista → form]`
  - Declarações de experiência `[lista → solicitar → documento assinado]`
- Comparar candidatos `[tabela/score]`
- Entrevistas `[agenda]`
- Relatórios `[por vaga/origem/estádio/tempo]`
- Configuração `[estágios, cargos, fontes, templates, habilidades]`

Padrão global da Shell: top bar com Central de Comunicação (Chat · Alertas · E-mails · Comunicados) + Tema; padrão de detalhe com abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`. **ValidationBadge** ao lado de dados validáveis; **LedgerTimeline** para histórico — nunca lista editável.

## 5. ENTIDADES PRINCIPAIS (schema `recruitment` — verbatim da Parte 1 v2)

> Apenas referências ao núcleo e aos ERPs — **sem duplicação** de pessoas/currículos.

```sql
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

> O perfil do candidato (cursos, treinamentos, documentos, experiências, CIV, CMA, declarações) vive nos schemas `identity`/`professional` do **Núcleo** (Parte 01 — Núcleo) — o Recrutamento apenas lê e edita via API, com `origin_app = RECRUTAMENTO` no ledger.

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

### 6.1 Vagas: externas vs internas
| Tipo | Visibilidade |
|------|--------------|
| **Externa** (público externo) | Listada **livremente** |
| **Interna** (somente funcionários) | Disponível **somente** para funcionários com vínculo ativo na empresa |

### 6.2 Fluxo do processo seletivo
1. **Vaga criada** (no RH do ERP ou no Recrutamento) → evento no ledger (`origin_app`) → visão do Recrutamento atualizada via event bus.
2. **Candidato se candidata** → cria `application` com **snapshot do perfil** → evento no ledger.
3. **Etapas** (triagem, entrevista, teste, proposta) → cada etapa gera bloco no ledger.
4. **Comunicação** via `application_messages` → cada mensagem gera bloco no ledger.
5. **Contratação finalizada** → o sistema **cria automaticamente o vínculo** (via `professional.work_experiences`) → evento no ledger — **sem cobrança alguma** (v2).
6. **Histórico exibido** = **filtro do Ledger** — nunca duplicado.

### 6.3 Regras do Recrutamento
1. NUNCA cria pessoa/curso/certificado próprio — lê e edita o perfil do núcleo (origem no ledger).
2. Vaga interna visível apenas para funcionário com vínculo ativo.
3. Vaga externa listada livremente.
4. Snapshot do perfil capturado no momento da candidatura (integridade histórica).
5. Todo evento gera bloco no ledger.
6. Contratação finalizada cria vínculo automático — **sem comissão** (v2).
7. O histórico exibido é SEMPRE um filtro do ledger.
8. **Pessoas nunca pagam** — nenhuma cobrança por evento, sem comissão de contratação, sem garantia paga, sem cobrança do candidato.
9. **Declarações de experiência:** solicitáveis pelo funcionário OU geradas no desligamento da empresa — documento estruturado, assinado, gerado do histórico de vínculo do núcleo e ancorado no ledger.

## 7. ENDPOINTS DA API (resumo — consumidos via `api.vortex.com`)

- `GET/POST/PUT /recruitment/job-postings` · `POST /recruitment/job-postings/:id/pause` · `:id/close` — vagas (2 origens: `origin_app = ERP_*` ou `RECRUTAMENTO`).
- `GET /recruitment/job-postings?visibility=INTERNAL` — vaga interna só retorna com vínculo ativo (validação no backend).
- `POST /recruitment/applications` — candidatar-se (captura snapshot do perfil).
- `GET /recruitment/applications?job=&stage=` — pipeline de candidatos (kanban).
- `POST /recruitment/applications/:id/stages` — avançar etapa.
- `POST /recruitment/applications/:id/messages` — comunicação do processo seletivo.
- `POST /recruitment/applications/:id/hire` — contratação → cria vínculo automático no Núcleo (`professional.work_experiences`), sem cobrança.
- `GET /professional/users/:id/profile` · `PUT /professional/users/:id/*` — perfil profissional (leitura/edição via Núcleo, `origin_app = RECRUTAMENTO`).
- `POST /professional/me/experience-statements` — solicitar declaração de experiência (também pelo Recrutamento).
- Todas as rotas de escrita exigem `Idempotency-Key`; resposta sempre `{ success, data, error }`.

## 8. FRONTEND ANGULAR (feature-lib `feature-recrutamento`)

1. Componentes **standalone** com **signals** + **OnPush** — sem `NgModule`.
2. Injeção com **`inject()`** — construtor de DI proibido em código novo.
3. Controle de fluxo **`@if`/`@for`/`@switch`** — `*ngIf`/`*ngFor` proibidos em código novo.
4. `input()`/`output()` function-based; formulários reativos **tipados** (`NonNullableFormBuilder`).
5. Estado de componente com signals; estado complexo local (kanban, pipeline) com NgRx ComponentStore.
6. Chamadas HTTP via services com `inject(HttpClient)`; interceptors em `libs/core` (token, erro padrão `{success,data,error}`, idempotency-key).
7. Toda tela de escrita valida permissão no backend; guards/hides são UX.
8. Histórico sempre via **LedgerTimeline** (nunca lista editável); **ValidationBadge** ao lado de dados do perfil do candidato.
9. Feature-lib `feature-recrutamento` importa apenas `shared-dto`, `ui`, `core` e `util-*` (module boundaries).

## 9. TESTES OBRIGATÓRIOS

1. Teste de agregador: Recrutamento não cria cadastro próprio; histórico é filtro do ledger.
2. Teste de **2 origens de vaga**: vaga criada no RH do ERP E no Recrutamento — ambas aparecem no Recrutamento, com `origin_app` diferente no ledger.
3. Teste de vaga interna: visível apenas para funcionário com vínculo ativo na empresa; externa livre.
4. Teste de snapshot: perfil capturado na candidatura permanece íntegro.
5. Teste de contratação: finalizar cria vínculo automático — **sem cobrança** (sem comissão).
6. Teste de RH completo: vaga com cargo, função, salário, requisitos e objetivo persistidos.
7. Teste de perfil editável: currículo editado pelo Recrutamento escreve no Núcleo com `origin_app = RECRUTAMENTO`.
8. Teste de declaração: solicitada pelo funcionário OU gerada no desligamento; documento assinado.
9. Teste de comunicação: cada mensagem do processo seletivo gera bloco no ledger.
10. Teste de etapas: cada etapa (triagem/entrevista/teste/proposta) gera bloco no ledger.
11. Teste de RLS: empresa A não vê candidatos/vagas da empresa B (403).
12. Teste de idempotency: retry não duplica. Teste de padrão de resposta: 100% das rotas em `{ success, data, error }`.

## 10. CRITÉRIOS DE ACEITE

- [ ] Recrutamento com **2 origens de vagas** (RH do ERP OU próprio Recrutamento) — ambas espelhando o Núcleo.
- [ ] **Sem comissão** (decisão 10/09/2026): embutido no ERP ou Assinatura de Vagas; pessoas nunca pagam; contratação não dispara cobrança.
- [ ] **RH completo**: cargo, função, salário, requisitos, objetivo, escala, visibilidade.
- [ ] Perfil profissional completo editável pelo Recrutamento — mesmo cadastro no Núcleo, origem no ledger.
- [ ] Snapshot do perfil na candidatura; etapas e mensagens ancoradas no ledger.
- [ ] Contratação finalizada cria vínculo automático (`professional.work_experiences`).
- [ ] Declarações de experiência solicitáveis pelo Recrutamento.
- [ ] Vaga interna restrita a funcionários com vínculo ativo (validação no backend).
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

| Módulo | Seções previstas |
|--------|------------------|
| **03.1 — Dashboard e relatórios** | 1. KPIs (vagas abertas, candidatos por estágio, tempo médio) · 2. Relatórios por vaga/origem/estádio/tempo · 3. Configuração (estágios, cargos, fontes, templates, habilidades) |
| **03.2 — Vagas** | 1. Lista/kanban (externas \| internas) · 2. Form RH completo (cargo, função, salário, requisitos, objetivo, escala, visibilidade) · 3. 2 origens (ERP \| Recrutamento) · 4. Regras de visibilidade interna/externa |
| **03.3 — Candidaturas e pipeline** | 1. Candidatar-se (snapshot do perfil) · 2. Kanban por estágio · 3. Etapas (triagem/entrevista/teste/proposta/contratação) · 4. Comunicação (application_messages) |
| **03.4 — Perfil do candidato** | 1. Detalhe (perfil do núcleo + habilidades + timeline) · 2. Comparar candidatos (tabela/score) · 3. Entrevistas (agenda) |
| **03.5 — Perfil profissional (edição via Recrutamento)** | 1. Currículo: cursos/treinamentos/documentos/experiências (escrita no Núcleo) · 2. Declarações de experiência · 3. ValidationBadge nos dados |
| **03.6 — Contratação e vínculo automático** | 1. Finalizar contratação · 2. Criação do vínculo no Núcleo (work_experiences) · 3. Sem cobrança (sem comissão) · 4. Meta-eventos no ledger |

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-1.md` — §15 (Recrutamento como agregador: princípio, vagas externas/internas, entidades, fluxo, regras), §2 (princípio arquitetural), §§19–20 (testes e critérios de aceite).
- `artifacts/vortex-v2/CLAUDE.md` — seção 4.3 (Recrutamento — novo modelo sem comissão), seção 3 (princípios), seção 8 (regras de engenharia), seção 11 (tabela de apps).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — seção 4 (menu Recrutamento nível-clique) e seção 15 (regras de navegação).
- `artifacts/vortex-v2/docs/00-visao-geral.md` — seções 3 e 9 (Recrutamento: embutido no ERP / Assinatura de Vagas; sem comissão; pessoas nunca pagam).
