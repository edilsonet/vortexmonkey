# VORTEX v4 — PARTE 08/14: ERP AGRÍCOLA (agri.vortex.com)

> **Origem na v2:** PARTE B da parte-6 v2 (ERP Agrícola 137 — desmembrado do Operadores na decisão de 12/09/2026). Consome o Núcleo (Parte 01): pessoas, empresas, catálogo, estoque, ledger.

## 1. OBJETIVO DA PARTE 08

Construir o **ERP Agrícola** (`agri.vortex.com` — assinatura; RBAC 137), aplicativo próprio, com:

1. **Comercial/CRM do domínio** (serviços aeroagrícolas — venda conduzida pelo app Fretamento/agrícola).
2. **Operador aeroagrícola**: CDAG, FCDAG, RT.
3. **Frota aeroagrícola**: aeronaves + dispersores + DGPS.
4. **Operações**: planejamento de aplicação, EMC, registro georreferenciado de faixas.
5. **SGSO aeroagrícola**: perigos/riscos (3 cenários), biblioteca de perigos, relatórios.
6. **Camada administrativa geral** + RH interno + Vagas.
7. **Frontend Angular** (feature-lib `feature-agri`).

> **App próprio (v2):** o ERP Agrícola foi **desmembrado do ERP Operadores** (decisão 12/09/2026) — subdomínio próprio, schema `agri` próprio, feature-lib `feature-agri` própria.

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

Referências ao CLAUDE.md v2: princípios (seção 3), ledger (seção 5-A), modelo em camadas (seção 4), aplicativos e subdomínios (seção 11).

- Operador aeroagrícola é `identity.companies` com certificado CDAG_137; RT é pessoa do Núcleo com vínculo aprovado.
- Aeronaves com validação RAB (idem ERP Operadores — Parte 05); dispersores e DGPS são ativos deste ERP.
- Toda aplicação, calibração e ocorrência gera bloco no Ledger (`origin_app = ERP_AGRICOLA`).
- Vagas do RH → Recrutamento (sem comissão — seção 4.3 do CLAUDE.md v2).
- Assinatura: `subscriptions.subscriptions` com `product = 'ERP_AGRICOLA'` e `includes_recruitment = TRUE` (parte 4 v2, seção 3.1).
- Estoque usa o catálogo do Núcleo; custódia do estoque empresarial migra para o ERP contratado (seção 4.5 do CLAUDE.md v2 — estoque bidirecional RLoja ↔ ERP).
- Ledger: conteúdo cifrado AES-256-GCM, hash sobre payload em claro, metadados em claro com `actor_role`/`origin_app` (seção 5-A do CLAUDE.md v2).

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- **RBAC 137** + **IS 137-001** (dispersores, EMC, disjuntores, helicópteros).
- **IS 137-002** (DGPS, Declaração de Conformidade de Instalação).
- **IS 137-003** (CDAG, FCDAG, 3 iterações, desistência 30 dias, suspensão 30 dias, cassação 360 dias).
- **IS 137.201-001** (etanol hidratado).
- **IS 137.215-001** (SGSO aeroagrícola, 3 cenários, biblioteca de perigos).

## 4. ESTRUTURA DE MENUS

| Menu | Conteúdo |
|------|----------|
| **Dashboard** | CDAG vigente · dispersores calibrados · aplicações do dia · SGSO |
| **Comercial/CRM** | Pipeline de serviços agrícolas → contratos (venda conduzida pelo app Fretamento/agrícola) |
| **Operador aeroagrícola** | CDAG (3 iterações; desistência/suspensão 30 dias; cassação 360 dias) · FCDAG · RT |
| **Frota aeroagrícola** | Aeronaves (validação RAB) + dispersores (calibração, EMC, disjuntores) + DGPS (Declaração de Conformidade) |
| **Operações** | Planejamento de aplicação · EMC · registro georreferenciado de faixas · etanol hidratado |
| **SGSO aeroagrícola** | Perigos/riscos (3 cenários) · biblioteca de perigos · relatórios |
| **RH interno / Vagas** | Funcionários · Treinamentos · vagas → Recrutamento |
| **Administrativo geral** | RH · Financeiro · Contabilidade (dupla entrada) · Compras |
| **Relatórios / Configuração** | Indicadores · parâmetros |

### 4.1 CRM do domínio (docs/09 v2, tabela CRM)

| App | O que vende | Pipeline | Onde opera |
|-----|-------------|----------|------------|
| **Agrícola (137)** | Serviços aeroagrícolas, aplicações | Novo → Proposta → Contrato → Execução | CRM do ERP + app **Fretamento** (agrícola) |

### 4.2 Padrões de navegação (docs/10 v2, seção 8)
- Dashboard `[CDAG | dispersores | aplicações]`.
- Tela de detalhe: abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.
- Histórico de qualquer registro abre como **LedgerTimeline** (filtro do ledger), nunca como lista editável.
- **ValidationBadge** (N0–N3) ao lado de dados de pessoa/documentos/vínculos/certificados.
- Toda tela de escrita valida permissão no backend; a navegação esconde apenas o que o usuário não pode ver (UX).

## 5. ENTIDADES PRINCIPAIS (schema `agri`)

```sql
CREATE TABLE agri.agri_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, company_id UUID NOT NULL,
    cdag_number VARCHAR(100), cdag_validity TIMESTAMPTZ,
    technical_manager_id UUID, -- RT (pessoa do Núcleo)
    status VARCHAR(20) DEFAULT 'ATIVO'
);

CREATE TABLE agri.dispersers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL, disperser_type VARCHAR(20),
    calibration_expiry DATE, emc_test_done BOOLEAN DEFAULT FALSE,
    circuit_breakers JSONB DEFAULT '[]', dgps_installed BOOLEAN DEFAULT FALSE,
    dgps_conformity_declaration VARCHAR(100), status VARCHAR(20) DEFAULT 'OPERACIONAL',
    ledger_block_id UUID
);

CREATE TABLE agri.application_records ( -- registro georreferenciado de faixas
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES agri.agri_operators(id),
    aircraft_id UUID NOT NULL, application_date DATE NOT NULL,
    area_geojson JSONB NOT NULL,           -- faixa georreferenciada
    product VARCHAR(255), dosage VARCHAR(100),
    fuel_type VARCHAR(20) DEFAULT 'ETANOL_HIDRATADO',
    ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agri.sgso_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, scenario VARCHAR(30) NOT NULL, -- 3 cenários IS 137.215-001
    hazard VARCHAR(255), risk_level VARCHAR(20), mitigation TEXT,
    status VARCHAR(20) DEFAULT 'ABERTO', ledger_block_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. **CDAG:** 3 iterações de análise (Etapa I); inércia 30 dias → desistência tácita; vacância do RT 30 dias → suspensão cautelar; suspensão 360 dias → cassação sumária.
2. **Dispersor com calibração vencida** → bloqueia uso (alerta BLOCKING).
3. **DGPS** exige Declaração de Conformidade de Instalação válida.
4. **EMC** testado e registrado; disjuntores conforme IS 137-001.
5. **Registro georreferenciado** de faixas de aplicação obrigatório (GeoJSON no evento do ledger).
6. **SGSO aeroagrícola:** 3 cenários + biblioteca de perigos (IS 137.215-001).
7. **Validação RAB** nas aeronaves (idem Parte 05 — ERP Operadores): matrícula ↔ titular no RAB; divergência bloqueia (BRE `AIRCRAFT_RAB_MISMATCH`); circuit breaker se RAB indisponível.
8. **Manutenção da frota:** `maintenance_control` alimentado automaticamente pela liberação APRS (v2) — nova disponibilidade de horas/ciclos/pousos/tempo-calendário; o histórico de serviços permanece no ledger.
9. **Manuais com recortes de Publicações (v2):** consulta ao manual via recorte conforme assinatura (idem Parte 07 — ERP Manutenção); sem assinatura → orientação de obtenção externa, sem bloquear a tarefa.
10. **Sem duplicação:** nenhuma tabela de pessoa no schema `agri`.
11. **Vagas** → Recrutamento (sem comissão).

## 6.1 Alertas do Hub Preditivo que tocam o ERP Agrícola (parte 4 v2, §5.3)

| Alerta | Severidade | Antecedência |
|--------|-----------|--------------|
| Dispersor com calibração vencida | BLOCKING | imediato |
| Aeronave bloqueada | CRITICAL | imediato |
| Treinamento vencendo | WARNING | 30 dias |
| Vínculo de experiência pendente de aprovação | INFO | imediato |
| Assinatura de ERP vencendo/suspensa | BLOCKING | 7 dias |
| Assinatura de Publicações vencendo (v2) | WARNING | 30 dias |

Regras do hub (parte 4 v2, §5.4): varredura preditiva a cada 6 horas (job); alertas BLOCKING bloqueiam a ação correspondente; alertas alimentam os badges da Shell (sino) com push em tempo real via WebSockets; notificações in-app + e-mail transacional (idempotente por notification_key); toda criação/resolução de alerta → ledger.

## 7. ENDPOINTS DA API (resumo)

- Comercial: `/api/v1/agri/opportunities`, `/api/v1/agri/contracts`
- Operador aeroagrícola: `/api/v1/agri/operators` (CDAG/FCDAG/RT)
- Frota aeroagrícola: `/api/v1/agri/aircraft` (+ `/validate-rab`), `/api/v1/agri/dispersers`, `/api/v1/agri/dgps`
- Operações: `/api/v1/agri/application-records` (registro georreferenciado), planejamento de aplicação, EMC
- SGSO aeroagrícola: `/api/v1/agri/sgso-events`
- Manutenção: `/api/v1/agri/maintenance-control` (alimentado pelo APRS)
- RH/vagas: `/api/v1/agri/job-postings`
- Dashboard: `/api/v1/agri/dashboard`

## 8. FRONTEND ANGULAR

- Feature-lib `feature-agri` na SPA única da Shell (Opção A — lazy loading; `loadChildren` por feature-lib; module boundaries previstos para desmembramento futuro — seção 7 do CLAUDE.md v2).
- Padrões v2 obrigatórios: **signals, standalone components, inject(), @if/@for**; Angular Material + Design System próprio (`@vortex/ui` com **ValidationBadge** N0–N3 e **LedgerTimeline**).
- Barra superior global: Central de Comunicação (Chat · Alertas · E-mails · Comunicados Oficiais) + Tema (3 estados).
- Sidebar gerada por permissão; guards de permissão (UX) + validação no backend (verdade).
- Telas (docs/10 v2, seção 8): dashboard `[CDAG | dispersores | aplicações]`; Comercial/CRM `[pipeline de serviços agrícolas → contratos]`; Operador aeroagrícola `[CDAG (3 iterações) | FCDAG | RT]`; Frota aeroagrícola `[aeronaves + dispersores (calibração) + DGPS (Declaração de Conformidade)]`; Operações `[planejamento de aplicação | EMC | registro georreferenciado de faixas]`; SGSO aeroagrícola `[perigos/riscos (3 cenários) | biblioteca de perigos | relatórios]`; RH interno + Vagas; Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`; Relatórios / Configuração.

## 9. TESTES OBRIGATÓRIOS

1. CDAG: 3 iterações; desistência tácita em 30 dias; suspensão cautelar por vacância do RT; cassação após 360 dias.
2. Dispersor com calibração vencida bloqueia uso.
3. DGPS sem Declaração de Conformidade bloqueia operação.
4. Registro de aplicação sem georreferência é rejeitado.
5. Validade RAB nas aeronaves.
6. SGSO: 3 cenários registráveis; biblioteca de perigos consultável.
7. **APRS alimenta o controle de manutenção:** liberação atualiza horas/ciclos/pousos/tempo-calendário restantes; histórico permanece no ledger.
8. **Recortes de Publicações:** assinatura ativa libera o recorte do manual; suspensa → tarefa abre sem recorte (sem bloquear a tarefa).
9. Nenhuma tabela de pessoa no schema `agri`.
10. Vaga interna visível só para funcionário com vínculo ativo (via Recrutamento).
11. Ancoragem: aplicação, calibração e CDAG geram blocos no ledger.

## 10. CRITÉRIOS DE ACEITE

- [ ] **App próprio** com CDAG/dispersores/DGPS/SGSO aeroagrícola (desmembrado do ERP Operadores).
- [ ] CRM de serviços agrícolas (pipeline → contrato), venda conduzida pelo app Fretamento/agrícola.
- [ ] Operador aeroagrícola completo: CDAG (3 iterações, desistência/suspensão/cassação), FCDAG, RT.
- [ ] Frota aeroagrícola com validação RAB, dispersores (calibração/EMC/disjuntores) e DGPS (Declaração de Conformidade).
- [ ] Operações com registro georreferenciado de faixas (GeoJSON no ledger) e etanol hidratado.
- [ ] SGSO aeroagrícola com 3 cenários e biblioteca de perigos.
- [ ] `maintenance_control` alimentado automaticamente pelo APRS; recortes de Publicações nos manuais.
- [ ] Camada administrativa geral (com Contabilidade de dupla entrada) operando.
- [ ] Vagas integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (`feature-agri`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.

## 11. MAPA DE MÓDULOS

Decomposição futura em pedaços menores — cada MÓDULO com suas SEÇÕES previstas:

1. **MÓDULO 08.1 — Fundação e Aderência** (seções: objetivo; aderência ao Núcleo/ledger; fundamentação RBAC 137 + ISs 137-001/002/003, 137.201-001, 137.215-001; assinatura ERP_AGRICOLA)
2. **MÓDULO 08.2 — Comercial/CRM** (seções: pipeline de serviços agrícolas; contratos; integração com o app Fretamento/agrícola)
3. **MÓDULO 08.3 — Operador aeroagrícola** (seções: CDAG — 3 iterações, desistência 30 dias, suspensão 30 dias, cassação 360 dias; FCDAG; RT — pessoa do Núcleo com vínculo aprovado)
4. **MÓDULO 08.4 — Frota aeroagrícola** (seções: aeronaves com validação RAB + circuit breaker; dispersores — calibração, EMC, disjuntores IS 137-001; DGPS — Declaração de Conformidade IS 137-002)
5. **MÓDULO 08.5 — Operações** (seções: planejamento de aplicação; EMC; registro georreferenciado de faixas — GeoJSON no ledger; etanol hidratado IS 137.201-001)
6. **MÓDULO 08.6 — SGSO aeroagrícola** (seções: perigos/riscos — 3 cenários IS 137.215-001; biblioteca de perigos; relatórios)
7. **MÓDULO 08.7 — Manutenção e Recortes de Publicações** (seções: maintenance_control alimentado pelo APRS; consulta ao manual via recorte conforme assinatura de Publicações (Parte 14))
8. **MÓDULO 08.8 — RH interno e Vagas** (seções: funcionários via vínculo do Núcleo; treinamentos; vagas → Recrutamento sem comissão)
9. **MÓDULO 08.9 — Camada administrativa geral** (seções: RH; Financeiro; Contabilidade de dupla entrada; Compras)
10. **MÓDULO 08.10 — Frontend feature-agri** (seções: rotas e lazy loading; ValidationBadge/LedgerTimeline; telas por menu; padrões signals/standalone/inject/@if/@for)
11. **MÓDULO 08.11 — Testes e Critérios de Aceite** (seções: testes 1–11; checklist de aceite)

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-6.md` — PARTE B (ERP Agrícola 137 — aplicativo próprio), seções B1–B7 (conteúdo verbatim: objetivo, aderência, fundamentação, menus, schemas `agri`, regras, testes) e PARTE C (critérios de aceite comuns).
- `artifacts/vortex-v2/CLAUDE.md` — seção 4 (modelo em camadas: 4.3 Recrutamento sem comissão, 4.4 CRM por ERP, 4.5 estoque bidirecional), seção 5-A (ledger), seção 11 (app 8 — agri.vortex.com, assinatura, 137: CDAG, dispersores, DGPS, SGSO aeroagrícola, desmembrado do ERP Operadores).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — seção 8 (ERP AGRÍCOLA 137 agri.vortex.com: árvore de menus nível-clique), seção 0 (Shell) e seção 15 (regras de navegação).
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — seção 4.7 (ERP Agrícola 137 — v2, desmembrado do Operadores: menus detalhados) e tabela CRM (Agrícola: serviços aeroagrícolas, app Fretamento/agrícola conduz a venda).
- `artifacts/vortex-v2/docs/prompts/parte-4.md` — modelo de assinatura (`ERP_AGRICOLA` com `includes_recruitment = TRUE`, seção 3.1) e alertas do Hub (dispersor com calibração vencida — BLOCKING).
