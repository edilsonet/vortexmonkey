# VORTEX v4 — PARTE 10/14: ERP AERÓDROMOS (airport.vortex.com)

> **Origem v2:** PARTE B do `docs/prompts/parte-7.md` (ERP Aeródromos), reorganizada sem alteração de conteúdo regulatório ou técnico. Consome o **Núcleo** (Parte 01/14) para pessoas, empresas, catálogo, estoque e ledger — nenhuma tabela de pessoa neste app.
> **Instrução ao agente de código:** engenheiro sênior em aeródromos (RBAC 153, SESCINC, SIGRA) e SGSO aeroportuário. Construa o ERP com rigor, TypeScript estrito, migrações SQL e testes. Execute completo.

---

## 1. OBJETIVO DA PARTE 10

1. **Comercial/CRM do domínio**: contratos (operadores, lojas, espaços, slots).
2. **Infraestrutura**: pista/taxiway/pátio, pavimento (PCN/IRI/macrotextura), sinalização/iluminação.
3. **Operações**: **pousos e decolagens**, RWYCC/RCR, inspeções/checklists, credenciamento de acesso (lado ar).
4. **SESCINC** (contraincêndio): viaturas, agentes, tempo-resposta ≤ 3 min.
5. **Fauna/SIGRA**: registros, risco, relatórios.
6. **Manutenção (8 áreas críticas)** e **SGSO aeroportuário** (relatórios quadrimestrais).
7. **Camada administrativa geral** + RH interno + Vagas.
8. **Frontend Angular** (feature-lib `feature-airport`).

---

## 2. ADERÊNCIA À ARQUITETURA CENTRAL (CLAUDE.md v2)

- Aeródromo é `identity.companies` (certificado AERODROMO_153); operadores/lojistas são empresas/pessoas do Núcleo.
- Credenciamento de acesso usa dados do Núcleo (identidade validada N2/N3).
- Toda inspeção, evento de fauna, ocorrência SESCINC, **movimento de pouso/decolagem** e contrato gera bloco no Ledger (`origin_app = ERP_AERODROMOS`) — princípios da seção 3 e seção 5-A do CLAUDE.md v2 (payload cifrado AES-256-GCM, hash sobre payload em claro, acesso auditado via `access_grants`).
- Estoque de materiais usa o catálogo do Núcleo; vagas de RH vão ao Recrutamento (sem comissão — CLAUDE.md v2, seção 4.3: uso embutido na assinatura do ERP, contratação cria vínculo automático, pessoas nunca pagam).
- Multi-tenant com RLS por linha (PostgreSQL 16); protocolo AAAA-NNNNNN (Res. 520/2019); assinatura eletrônica no bloco padrão SEI (seção 5-B).
- Camada administrativa geral conforme seção 4.1 do CLAUDE.md v2 (RH · Financeiro · Contabilidade de dupla entrada · Compras · Comercial/CRM · Documentos/Contratos).

---

## 3. FUNDAMENTAÇÃO REGULATÓRIA

RBAC 153 (aeródromos: 8 áreas críticas de manutenção — sinalização horizontal/vertical, iluminação, pavimento, etc.), SESCINC (tempo-resposta ≤ 3 minutos), SIGRA (gestão de risco da fauna), SGSO aeroportuário (relatórios quadrimestrais). **v2: pousos e decolagens integram o escopo operacional** (registro de movimentos, controle de compatibilidade RWYCC/operação).

---

## 4. ESTRUTURA DE MENUS (docs/09 v2 §4.8 + docs/10 v2 §9)

| Menu | Conteúdo |
|------|----------|
| **Dashboard** | RWYCC atual · SESCINC · fauna · inspeções · **movimentos de pousos/decolagens** · contratos |
| **Comercial/CRM** | Pipeline → Contratos (operadores, lojas, espaços, slots) |
| **Infraestrutura** | Pista/Taxiway/Pátio · Pavimento (PCN/IRI/macrotextura) · Sinalização · Iluminação · Cerca/patrimônio |
| **Operações** | **Pousos e decolagens (v2)** · RWYCC/RCR · Inspeções (checklists) · Credenciamento de acesso (lado ar) · Obra/trabalho em pátio |
| **SESCINC** | Viaturas · Agentes · Tempo-resposta · Exercícios |
| **Fauna/SIGRA** | Registros de fauna · Risco · Mitigação · Relatórios |
| **Manutenção (8 áreas)** | Ordens por área crítica · Equipamentos · Infraestrutura |
| **SGSO** | Perigos · Riscos · Relatórios quadrimestrais |
| **RH interno / Vagas** | Funcionários · Credenciais · vagas → Recrutamento |
| **Administrativo geral** | RH · Financeiro · **Contabilidade (dupla entrada)** · Compras |
| **Relatórios / Configuração** | Indicadores operacionais · Áreas críticas · Checklists · Templates |

Árvore nível-clique (docs/10 v2 §9):
- Dashboard `[RWYCC | SESCINC | fauna | inspeções | pousos/decolagens]`
- Comercial/CRM `[pipeline → contratos (operadores, lojas, espaços, slots)]`
- Infraestrutura `[pista/taxiway/pátio | pavimento (PCN/IRI/macrotextura) | sinalização | iluminação]`
- Operações `[pousos e decolagens | RWYCC/RCR | inspeções (checklists) | credenciamento lado ar]`
- SESCINC `[viaturas | agentes | tempo-resposta ≤3 min | exercícios]`
- Fauna/SIGRA `[registros | risco | mitigação]`
- Manutenção (8 áreas) `[ordens por área]`
- SGSO `[perigos | riscos | relatório quadrimestral]`
- RH interno + Vagas · Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`
- Relatórios / Configuração

---

## 5. ENTIDADES PRINCIPAIS (schema `airport` — verbatim da v2)

```sql
CREATE TABLE airport.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, contract_type VARCHAR(30) NOT NULL, -- OPERADOR/LOJA/ESPACO/SLOT
    counterparty_company_id UUID, counterparty_person_id UUID,
    start_date DATE, end_date DATE, status VARCHAR(20) DEFAULT 'ATIVO',
    ledger_block_id UUID
);

CREATE TABLE airport.pavement_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, segment VARCHAR(30) NOT NULL, -- RWY/TWY/APRON
    pcn VARCHAR(50), iri NUMERIC(5,2), macrotexture NUMERIC(5,2),
    last_inspection DATE, next_inspection DATE, status VARCHAR(20) DEFAULT 'OPERACIONAL',
    ledger_block_id UUID
);

CREATE TABLE airport.rwycc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, rwy VARCHAR(10), third VARCHAR(10),
    rwycc VARCHAR(10) NOT NULL, -- 0-6
    contamination VARCHAR(50), observed_at TIMESTAMPTZ DEFAULT NOW(),
    rcr_actual INT, rcr_required INT, released BOOLEAN DEFAULT FALSE,
    ledger_block_id UUID
);

-- v2: registro de movimentos (pousos e decolagens)
CREATE TABLE airport.movement_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('POUSO','DECOLAGEM')),
    rwy VARCHAR(10) NOT NULL,
    aircraft_registration VARCHAR(10),
    operator_company_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rwycc_at_movement VARCHAR(10),       -- RWYCC vigente no momento
    operation_compatible BOOLEAN NOT NULL DEFAULT TRUE, -- compatibilidade RWYCC/operação
    flight_ref VARCHAR(30),              -- referência ao voo (quando 121/135)
    ledger_block_id UUID
);

CREATE TABLE airport.sescinc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, occurrence_type VARCHAR(50), category VARCHAR(20),
    response_time_seconds INT NOT NULL, vehicles JSONB DEFAULT '[]',
    agents_status VARCHAR(20) DEFAULT 'OK', extinguishant_level VARCHAR(20),
    occurred_at TIMESTAMPTZ DEFAULT NOW(), ledger_block_id UUID
);

CREATE TABLE airport.wildlife_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, species VARCHAR(100), risk_level VARCHAR(20),
    mitigation TEXT, event_date TIMESTAMPTZ DEFAULT NOW(), sigra_status VARCHAR(20),
    ledger_block_id UUID
);

CREATE TABLE airport.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, checklist_type VARCHAR(50) NOT NULL,
    area VARCHAR(30) NOT NULL, findings JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'CONCLUIDA', inspected_by UUID,
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Sem duplicação:** nenhuma tabela de pessoa no schema `airport` — identidade e credenciais vivem no Núcleo (Parte 01).

---

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. **SESCINC:** tempo-resposta ≤ **3 minutos** (se exceder → CRITICAL + alerta).
2. **RWYCC rebaixado** bloqueia operações compatíveis (alerta imediato; RCR atual vs. requerido).
3. **Pousos e decolagens (v2):** todo movimento é registrado (`movement_log`) com RWYCC vigente e verificação de **compatibilidade RWYCC/operação** — pouso/decolagem em RWYCC incompatível é bloqueado e gera CRITICAL.
4. **Pavimento:** inspeções periódicas (IRI/macrotextura); vencida → WARNING e restrição quando aplicável.
5. **Agente extintor abaixo do mínimo** → CRITICAL/BLOCKING para pousos/decolagens.
6. **Fauna:** registro obrigatório; nível de risco alimenta SIGRA e restrições.
7. **Credenciamento de acesso (lado ar):** identidade validada (N2/N3) via Núcleo; credencial vencida bloqueia.
8. **Manutenção nas 8 áreas críticas** com ordens por área; cada checklist/inspeção registra no ledger.
9. **SGSO:** perigos e riscos com relatório **quadrimestral** (20/01, 20/05, 20/09).
10. **Vagas do RH** (operadores de equipamentos, bombeiros, etc.) vão ao Recrutamento; contratação cria vínculo automático — sem comissão.
11. **Sem duplicação:** nenhuma tabela de pessoa no schema `airport`.

---

## 7. ENDPOINTS DA API (resumo)

Todos sob `/api/airport` (NestJS, módulo `airport` do monorepo Nx), autenticados e com RLS por tenant; escritas ancoram bloco no ledger com `origin_app = ERP_AERODROMOS`:

- `POST /contracts` · `PATCH /contracts/:id` · `GET /contracts` (alerta de vencimento WARNING 30 dias)
- `POST /pavement-conditions` · `PATCH /pavement-conditions/:id/inspecao`
- `POST /rwycc` · `GET /rwycc/atual` · `POST /rwycc/:id/liberacao`
- `POST /movement-log` (pouso/decolagem com RWYCC vigente + compatibilidade) · `GET /movement-log`
- `POST /sescinc/ocorrencias` · `POST /sescinc/exercicios` · `GET /sescinc/tempo-resposta`
- `POST /wildlife-events` · `GET /sigra/relatorios`
- `POST /inspections` (checklists por área)
- Camada administrativa geral: endpoints padrão de RH, Financeiro (dupla entrada — seção 6 do CLAUDE.md v2), Compras e CRM.

---

## 8. FRONTEND ANGULAR (feature-lib `feature-airport`)

- Feature-lib `libs/feature-airport` na Shell SPA (Opção A — lazy loading por feature-lib, module boundaries preparados para desmembramento futuro — CLAUDE.md v2, seção 7).
- Padrões v2 obrigatórios (seção 18 da Parte 1 v2): **Angular moderno — signals, standalone components, `inject()`, controle de fluxo `@if/@for`**; nunca NgModules, nunca `*ngIf/*ngFor`.
- UI = Angular Material + Design System próprio (`@vortex/ui` com `ValidationBadge` N0–N3).
- Estado local com signals + NgRx ComponentStore (sem NgRx global); WebSockets para alertas operacionais (CRITICAL: RWYCC incompatível, SESCINC > 3 min, extintor abaixo do mínimo).
- Consulta de operadores/lojistas/credenciados sempre via API do Núcleo (sem cache local de pessoa).
- Dashboard operacional com RWYCC vigente por pista/terço e feed de movimentos de pousos/decolagens.

---

## 9. TESTES OBRIGATÓRIOS (verbatim da v2)

1. Tempo-resposta SESCINC > 3 min gera CRITICAL.
2. RWYCC rebaixado bloqueia operação correspondente.
3. **Movimento (pouso/decolagem) em RWYCC incompatível é bloqueado e gera CRITICAL; movimento registrado com RWYCC vigente.**
4. Pavimento com inspeção vencida gera WARNING/restrição.
5. Agente extintor abaixo do mínimo bloqueia.
6. Credencial de acesso vencida bloqueia entrada no lado ar.
7. Evento de fauna registrado alimenta SIGRA.
8. Relatório quadrimestral do SGSO gerado nas datas oficiais.
9. Contrato vencendo gera alerta (WARNING 30 dias).
10. Ancoragem: movimento, inspeção, fauna e SESCINC geram blocos no ledger.

---

## 10. CRITÉRIOS DE ACEITE (da Parte C v2, recorte Aeródromos)

- [ ] ERP Aeródromos com contratos, infraestrutura, operações (**pousos/decolagens com registro de movimentos e compatibilidade RWYCC**), SESCINC, fauna/SIGRA, manutenção 8 áreas, SGSO quadrimestral.
- [ ] Camada administrativa geral (com Contabilidade de dupla entrada) operando.
- [ ] Vagas de RH integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (feature-lib `feature-airport`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.

---

## 11. MAPA DE MÓDULOS (decomposição futura em pedaços menores)

Cada módulo abaixo será fragmentado em seções numeradas (M10.S01, M10.S02, …) para construção incremental:

- **M10.1 — Fundação do ERP (schema `airport` + integração Núcleo):** S01 migrações do schema `airport` (contracts, pavement_conditions, rwycc, movement_log, sescinc, wildlife_events, inspections) · S02 RLS multi-tenant + seeds RBAC (153) · S03 cliente do Núcleo (empresas, pessoas, credenciamento N2/N3, catálogo/estoque) · S04 ancoragem no ledger (`origin_app = ERP_AERODROMOS`).
- **M10.2 — Comercial/Contratos:** S01 pipeline comercial do domínio (operadores, lojas, espaços, slots) · S02 CRUD de contratos + contrapartes do Núcleo · S03 alerta de vencimento (WARNING 30 dias) + renovações.
- **M10.3 — Infraestrutura e pavimento:** S01 pista/taxiway/pátio (segmentos RWY/TWY/APRON) · S02 pavimento PCN/IRI/macrotextura + inspeções periódicas (WARNING/restrição) · S03 sinalização e iluminação · S04 cerca/patrimônio.
- **M10.4 — Operações (pousos/decolagens + RWYCC):** S01 registro de RWYCC/RCR (0-6, terceiro, contaminação) + liberação · S02 `movement_log` (POUSO/DECOLAGEM com RWYCC vigente) · S03 verificação de compatibilidade RWYCC/operação (bloqueio + CRITICAL) · S04 inspeções/checklists por área · S05 credenciamento de acesso lado ar (credencial vencida bloqueia) · S06 obra/trabalho em pátio.
- **M10.5 — SESCINC:** S01 viaturas, agentes e níveis de extintor (abaixo do mínimo → CRITICAL/BLOCKING) · S02 ocorrências com tempo-resposta ≤ 3 min (excedido → CRITICAL + alerta) · S03 exercícios e prontidão.
- **M10.6 — Fauna/SIGRA:** S01 registros de fauna obrigatórios · S02 níveis de risco → SIGRA e restrições · S03 mitigação e relatórios.
- **M10.7 — Manutenção (8 áreas) e SGSO:** S01 ordens de manutenção por área crítica (8 áreas) + equipamentos · S02 SGSO: perigos e riscos · S03 relatório quadrimestral (20/01, 20/05, 20/09).
- **M10.8 — Camada administrativa geral:** S01 RH interno + Vagas → Recrutamento (operadores de equipamentos, bombeiros etc.) · S02 Financeiro + Contabilidade de dupla entrada (seção 6) · S03 Compras + Relatórios e Configuração (indicadores, áreas críticas, checklists, templates).
- **M10.9 — Frontend:** S01 feature-lib `feature-airport` (rotas lazy + module boundaries) · S02 Dashboard operacional (RWYCC, SESCINC, fauna, movimentos) · S03 telas de Operações/Infraestrutura · S04 telas de SESCINC/Fauna/Manutenção/SGSO + alertas WebSocket.

---

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-7.md` — PARTE B (ERP Aeródromos): objetivo, aderência, fundamentação, menus, schema `airport` (incl. `movement_log` v2), regras, testes (conteúdo verbatim).
- `artifacts/vortex-v2/CLAUDE.md` — seções 3 (princípios), 4.1/4.2/4.3/4.4 (camadas, Recrutamento sem comissão, CRM por ERP), 5-A (ledger), 5-B (assinatura), 6 (contabilidade), 7 (Shell), 11 (aplicativos e subdomínios — linha 9: ERP Aeródromos `airport.vortex.com`).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — §9 ERP Aeródromos (árvore de menus nível-clique).
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — §4.8 ERP Aeródromos (menus) e CRM do ERP.
