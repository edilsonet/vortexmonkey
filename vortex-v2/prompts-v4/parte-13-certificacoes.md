# VORTEX v4 — PARTE 13/14: CERTIFICAÇÕES (certificacoes.vortex.com)

> **Origem:** Parte 9 v2 §4 (CertPub), reorganizada em 14 partes (uma por app). Na v4 o antigo CertPub foi dividido: esta parte contém **somente as CERTIFICAÇÕES**; as Publicações (manuais licenciados e recortes) ficam na Parte 14. Consome o Núcleo — Parte 01 (Cadastro Central, Ledger, billing) e integra RLoja (Parte 04).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em produtos de conformidade regulatória e trilhas de certificação. Construa o módulo conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, migrações SQL, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 13

1. **Certificações** — certificações como **produto na RLoja**: trilha de conformidade por norma que conduz a empresa à certificação/cumprimento para **91 Apêndice K, 121, 135, 137, 145, 141, 142 e 153**.
2. **Frontend Angular** — feature-lib `feature-certificacoes`.

> **Aderência à arquitetura central:** o app de Certificações é consumidor do Núcleo — empresas certificandas são empresas do Cadastro Central, documentos no document-service (Parte 01 — M4), comissões/assinaturas via eventos do ledger (Parte 01 — Núcleo), ancoragem de todos os eventos no ledger. Schema `certifications` já criado na fundação (Parte 01).

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

- **Núcleo dono da verdade:** a empresa certificanda é uma empresa do Cadastro Central; evidências são documentos assinados (Parte 01 — M4, Lei 14.063/2020 + bloco SEI/ANAC).
- **Ledger imutável (Res. ANAC 458/2017):** compra, trilha e requisito cumprido geram blocos no ledger com `origin_app = CERTIFICACOES`; histórico abre como LedgerTimeline.
- **RLoja = canal de venda:** o produto de certificação é anunciado na RLoja (`published_rloja`); a compra na RLoja cria a trilha. A RLoja é marketplace multi-vendor — vender não exige tenant.
- **Billing (Parte 01 — Núcleo):** comissões acionadas por eventos do ledger.
- **RLS multi-tenant:** usuário sem vínculo não acessa trilhas de outros tenants; validação N0–N3 nunca bloqueia o fluxo.

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **Normas cobertas pelas trilhas de certificação:** RBAC 91 Apêndice K, RBAC 121, RBAC 135, RBAC 137, RBAC 145, RBAC 141, RBAC 142 e RBAC 153 — requisitos vindos da matriz regulatória (docs/01) e dos seeds (`shared-dto`, docs/05).
- **Trilha de conformidade:** checklist por requisito (da matriz regulatória), documentos exigidos, protocolos SEI, acompanhamento de fase (ex.: 5 fases de certificação de operador). A trilha consome os requisitos dos seeds e exibe o progresso com ValidationBadge (N0–N3).

## 4. ESTRUTURA DE MENUS (docs/10 §13 — bloco Certificações)

- **Certificações** `[catálogo por norma (91 Ap.K, 121, 135, 137, 145, 141, 142, 153) → comprar na RLoja → trilha de conformidade: checklist por requisito → documentos → protocolos → acompanhamento]`
  - Minha certificação `[detalhe: fase atual, pendências, evidências, [timeline]]`
- Configuração `[produtos, preços]`

Regras de navegação aplicáveis (docs/10 §15): tela de detalhe segue o padrão de abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`; ValidationBadge (N0–N3) ao lado de requisitos e certificados.

## 5. ENTIDADES PRINCIPAIS (schema `certifications` — verbatim Parte 9 v2 §4.3, schema renomeado)

```sql
CREATE SCHEMA IF NOT EXISTS certifications;

CREATE TABLE certifications.certification_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    norm VARCHAR(30) NOT NULL,             -- 91_APK, 121, 135, 137, 145, 141, 142, 153
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(15,2) NOT NULL,
    published_rloja BOOLEAN DEFAULT TRUE,  -- anunciado na RLoja
    status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certifications.certification_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES certifications.certification_products(id),
    company_id UUID NOT NULL,              -- empresa certificanda
    current_phase VARCHAR(50),             -- ex.: FASE_1..FASE_5, CERTIFICADO
    progress_percent NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'EM_ANDAMENTO'
      CHECK (status IN ('EM_ANDAMENTO','CONCLUIDA','SUSPENSA')),
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certifications.track_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES certifications.certification_tracks(id),
    seed_id INT NOT NULL,                  -- requisito da matriz (docs/01/seeds)
    requirement_title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','EM_CUMPRIMENTO','CUMPRIDO','NAO_CUMPRIDO')),
    evidence_document_id UUID,             -- documento comprobatório (assinado)
    protocol_number VARCHAR(20),           -- protocolo SEI (quando aplicável)
    completed_at TIMESTAMPTZ,
    ledger_block_id UUID
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS (verbatim Parte 9 v2 §4.1 — bloco Certificações)

**Certificações (produto na RLoja):**
- Produto online anunciado na RLoja que **conduz a empresa à certificação/cumprimento** para: 91 Apêndice K, 121, 135, 137, 145, 141, 142 e 153.
- **Trilha de conformidade:** checklist por requisito (da matriz regulatória — docs/01), documentos exigidos, protocolos SEI, acompanhamento de fase (ex.: 5 fases de certificação de operador).
- A trilha consome os requisitos dos seeds (`shared-dto`) e exibe o progresso com ValidationBadge.

**Regras do app:**
1. **Certificações:** compra na RLoja → cria `certifications.certification_tracks` para a empresa; requisitos vêm dos seeds; evidências são documentos assinados (Parte 01 — M4); protocolos SEI vinculados; progresso exibido com ValidationBadge.
2. Ancoragem: compra, trilha e requisito cumprido geram blocos no ledger (`origin_app = CERTIFICACOES`).

## 7. ENDPOINTS DA API (bloco Certificações — verbatim Parte 9 v2 §4.5, prefixo renomeado)

- `GET /certifications/products` — catálogo de produtos de certificação.
- `POST /certifications/tracks` — iniciar trilha (após compra na RLoja).
- `GET /certifications/tracks/:id` — progresso da trilha.
- `POST /certifications/tracks/:id/requirements/:reqId/evidence` — anexar evidência (documento assinado).
- `POST /certifications/tracks/:id/requirements/:reqId/complete` — marcar requisito cumprido.

## 8. FRONTEND ANGULAR (`feature-certificacoes` — verbatim Parte 9 v2 §5.3, bloco Certificações)

- **Certificações:** catálogo por norma → comprar na RLoja → trilha `[checklist por requisito com ValidationBadge → evidências → protocolos]` → Minha certificação `[fase, pendências, timeline]`.

Padrões obrigatórios (idem Parte 01, seção 18): standalone + signals + OnPush + `inject()` + `@if/@for`; formulários reativos tipados; LedgerTimeline para histórico; ValidationBadge em trilhas e requisitos; guards de permissão (UX) + validação no backend.

## 9. TESTES OBRIGATÓRIOS (verbatim Parte 9 v2 §6, itens de Certificações)

1. Teste Certificações: compra na RLoja cria trilha; requisitos dos seeds; evidência assinada marca CUMPRIDO.
2. Teste Certificações: trilha exibe progresso com ValidationBadge e fase atual.
3. Teste de ancoragem: trilha e requisito cumprido geram blocos no ledger com `origin_app = CERTIFICACOES`.
4. Teste de RLS: usuário sem vínculo não acessa trilhas de outros tenants.

## 10. CRITÉRIOS DE ACEITE

- [ ] Certificações operando (produto na RLoja, trilha por norma com requisitos dos seeds, evidências, protocolos).
- [ ] Frontend Angular (`feature-certificacoes`) conforme padrões v2.
- [ ] Testes de aceite passando; lacunas listadas.

## 11. MAPA DE MÓDULOS

> Base para a fragmentação futura em pedaços menores (prompts de construção por módulo/seção).

- **MÓDULO 13.1 — Produtos de certificação** (`certifications.certification_products`)
  - Seções previstas: 13.1.1 catálogo por norma (91_APK, 121, 135, 137, 145, 141, 142, 153) · 13.1.2 publicação na RLoja (`published_rloja`) · 13.1.3 preços
- **MÓDULO 13.2 — Trilhas de conformidade** (`certifications.certification_tracks`)
  - Seções previstas: 13.2.1 compra na RLoja cria trilha · 13.2.2 fases (FASE_1..FASE_5, CERTIFICADO) · 13.2.3 progresso + ValidationBadge · 13.2.4 estados (EM_ANDAMENTO/CONCLUIDA/SUSPENSA)
- **MÓDULO 13.3 — Requisitos da trilha** (`certifications.track_requirements`)
  - Seções previstas: 13.3.1 requisitos dos seeds (docs/01/docs/05) · 13.3.2 evidência = documento assinado (Parte 01 — M4) · 13.3.3 protocolo SEI · 13.3.4 máquina de estados (PENDENTE→EM_CUMPRIMENTO→CUMPRIDO/NAO_CUMPRIDO)
- **MÓDULO 13.4 — Ancoragem no ledger**
  - Seções previstas: 13.4.1 blocos de compra/trilha/requisito com `origin_app = CERTIFICACOES` · 13.4.2 LedgerTimeline da trilha
- **MÓDULO 13.5 — Frontend `feature-certificacoes`**
  - Seções previstas: 13.5.1 catálogo de certificações · 13.5.2 trilha (checklist + evidências + protocolos) · 13.5.3 minha certificação · 13.5.4 padrões Angular v2 + module boundaries

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-9.md` — §4 Certificações e Publicações (entidades, regras, endpoints, testes) — conteúdo verbatim do bloco Certificações.
- **Divisão v4:** o antigo CertPub (Parte 13 v3) foi dividido em Parte 13 (Certificações — esta) e Parte 14 (Publicações). Renomeações aplicadas: schema `certpub` → `certifications`; `origin_app = CERTPUB` → `CERTIFICACOES`; endpoints `/certpub/*` → `/certifications/*`; feature-lib `feature-certpub` → `feature-certificacoes`.
- `artifacts/vortex-v2/CLAUDE.md` — seção 11 (Certificações e Publicações, tabela de apps) e princípio de produtos (8 produtos).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §13 Certificações e Publicações (menus — bloco Certificações) e §15 regras de navegação.
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.12 Certificações e Publicações.
