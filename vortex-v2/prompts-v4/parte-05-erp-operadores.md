# VORTEX v4 — PARTE 05/14: ERP OPERADORES (ops.vortex.com)

> **Origem na v2:** PARTE A da parte-6 v2 (ERP Operadores 91/119/121/135) + §4 da parte-4 v2 (PPSP — RBAC 120). Consome o Núcleo (Parte 01): pessoas, CIV/CMA, licenças, catálogo, estoque, ledger.

## 1. OBJETIVO DA PARTE 05

Construir o **ERP Operadores** (`ops.vortex.com` — assinatura; RBAC 91/119/121/135), com:

1. **Comercial/CRM do domínio** (fretamento, charters, contratos de operação — venda conduzida pelo app Fretamento).
2. **Departamento Operações**: frota, despacho, diário técnico da aeronave, MEL, manuais, tripulação (validada pelo Núcleo), relatórios ANAC.
3. **Departamento Manutenção**: manutenção de linha da frota, controle de manutenção (alimentado pelo APRS), suprimentos técnicos.
4. **Camada administrativa geral** (RH, Financeiro, Contabilidade de dupla entrada, Compras) + RH interno + **PPSP (RBAC 120)** + Vagas.
5. **Frontend Angular** (feature-lib `feature-ops`).

> **O PPSP é serviço do ERP Operadores** (RBAC 120: ARSO, toxicológico de 90 dias, sorteio ≥25%/ano) — movido da parte 4 v2 para este app, usando o Cadastro Central de Pessoas do Núcleo como fonte única.

## 2. ADERÊNCIA À ARQUITETURA CENTRAL

Referências ao CLAUDE.md v2: princípios (seção 3), ledger (seção 5-A), modelo em camadas (seção 4), aplicativos e subdomínios (seção 11).

- **Dados de PESSOA vivem no Núcleo (Cadastro Central):** CIV, CMA, licenças/habilitações (RBAC 61/63/65), cursos, treinamentos, experiência, vínculos.
- **Dados de AERONAVE/operação vivem neste ERP:** frota, diário técnico da aeronave (célula/motor/hélice/APU), MEL, despacho, manuais.
- O ERP **nunca** cria CIV/CMA; o despacho **consulta o Núcleo** para validar tripulação (licença ativa, CMA válido, recenticidade, treinamentos vigentes).
- Evento `FLIGHT_CLOSED` permite ao Núcleo **pré-preencher rascunho** na CIV do piloto (registro assinado só após confirmação do piloto).
- Estoque usa o catálogo do Núcleo; custódia do estoque empresarial migra para o ERP contratado (seção 4.5 do CLAUDE.md v2 — estoque bidirecional RLoja ↔ ERP).
- Toda operação gera bloco no Ledger (`origin_app = ERP_OPERADORES`); Recrutamento consome as vagas do RH deste ERP (sem comissão — seção 4.3 do CLAUDE.md v2).
- Assinatura: `subscriptions.subscriptions` com `product = 'ERP_OPERADORES'` e `includes_recruitment = TRUE` (parte 4 v2, seção 3.1).
- Ledger: conteúdo cifrado AES-256-GCM, hash sobre payload em claro, metadados em claro com `actor_role`/`origin_app` (seção 5-A do CLAUDE.md v2).

## 3. FUNDAMENTAÇÃO REGULATÓRIA

- RBAC 91 (MEL IS 91-012, CVA IS 91-403-001, TBO, monitoramento de motores, aprovações PBN/EFB/RVSM/CAT II/III etc.), RBAC 119 (certificação em 5 fases), RBAC 121 (despacho, ETOPS, MCmsV, UPRT, MGM/PMAC, SGSO IS 121-1225-001), RBAC 135 (MGO, aeromédico, ambiente hostil, repeso 36 meses). CIV/CMA: RBAC 61/IS 61-001G e RBAC 67 (no Núcleo).
- **Validação RAB (v2):** no cadastro de aeronave, a matrícula é confrontada com a base pública do RAB — o operador/proprietário cadastrado deve coincidir com o titular no RAB (nome + CPF/CNPJ). Divergência → cadastro bloqueado (regra `AIRCRAFT_RAB_MISMATCH` do BRE).
- **RBAC 120 (PPSP):** aplicabilidade (120.1), definições PPSP/ARSO (120.3), pessoal abrangido ARSO (120.5), substâncias psicoativas (120.7, Portaria SVS/MS 344/98 e álcool), programa de prevenção (120.9), manual de prevenção (120.11), declaração de conformidade (120.13), exames toxicológicos (120.15), registros do programa no ledger (120.17), educação e treinamento (120.19), supervisão (120.21), afastamento do ARSO (120.23).
- **IS 120-002D:** orientações de implantação, identificação de ARSO, exame de janela longa, subprogramas de educação.

## 4. ESTRUTURA DE MENUS

### 4.1 Dashboard
`[KPIs frota/despacho/conformidade]`

### 4.2 Departamento Operações
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Pipeline de fretamento/charters → Propostas → Contratos/Clientes (venda conduzida pelo app Fretamento) |
| **Frota** | Aeronaves (**validação RAB**) · Contratos/leasing · Custos · Repeso (36 meses) |
| **Despacho** | Liberações de voo: combustível, met, P&B, MEL, tripulação (via Núcleo) · DOV |
| **Diário técnico da aeronave** | Lançamentos de voo (horas/ciclos célula/motor/hélice/APU) · Discrepâncias · MEL/CDL |
| **Tripulação** | Escalas · Validação de licenças/CMA/recenticidade (leitura do Núcleo) |
| **Manuais** | MGO · AOM · MCmsV · MGM · PTO · SOP (aprovação ANAC) · **Recortes de Publicações (v2)** |
| **Relatórios ANAC** | Mensal dia 15 · Semestrais (examinadores março/setembro) · FOP/PSF/ROP |

### 4.3 Departamento Manutenção
| Menu | Conteúdo |
|------|----------|
| **Manutenção de linha** | Solicitações · Ordens de manutenção da frota |
| **Controle de manutenção** | Cumprimento de manutenção programada · DA · MEL deferidos — **atualizado automaticamente pela liberação APRS (v2)** |
| **Suprimentos técnicos** | Peças da frota (catálogo do Núcleo) · Ferramentas |
| **Compras** | Pedidos · Fornecedores |
| **Qualidade/SGSO** | Não conformidades · Perigos · Relatórios |

### 4.4 Camada administrativa geral + RH interno + PPSP
RH · Financeiro · Contabilidade (dupla entrada) · Compras (uso geral) · RH interno (funcionários via vínculo do Núcleo; treinamentos da empresa; **PPSP/RBAC 120**) · **Vagas (v2 → Recrutamento)** · Relatórios · Configuração.

### 4.5 Padrões de navegação (docs/10 v2)
- Tela de detalhe: abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.
- Histórico de qualquer registro abre como **LedgerTimeline** (filtro do ledger), nunca como lista editável.
- **ValidationBadge** (N0–N3) ao lado de dados de pessoa/documentos/vínculos/certificados.
- Toda tela de escrita valida permissão no backend; a navegação esconde apenas o que o usuário não pode ver (UX).

## 5. ENTIDADES PRINCIPAIS (schema `ops`)

```sql
CREATE TABLE ops.air_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, company_id UUID NOT NULL,
    operator_type VARCHAR(30) NOT NULL, -- RBAC_91/121/135
    coa_number VARCHAR(100), coa_validity TIMESTAMPTZ,
    classification VARCHAR(20), eo_number VARCHAR(100),
    certification_phase VARCHAR(20) DEFAULT 'FASE_1'
      CHECK (certification_phase IN ('FASE_1','FASE_2','FASE_3','FASE_4','FASE_5','CERTIFICADO')),
    status VARCHAR(20) DEFAULT 'ATIVO'
);

CREATE TABLE ops.operator_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES ops.air_operators(id),
    aircraft_id UUID NOT NULL, registration VARCHAR(10) NOT NULL, model VARCHAR(100),
    rab_validated BOOLEAN NOT NULL DEFAULT FALSE,        -- v2: validação RAB
    rab_owner_name VARCHAR(255), rab_owner_document VARCHAR(20), -- titular no RAB
    rab_validated_at TIMESTAMPTZ,
    max_passengers INT, max_takeoff_weight_kg NUMERIC(10,2),
    last_reweigh_date DATE, next_reweigh_date DATE,
    status VARCHAR(20) DEFAULT 'OPERACIONAL'
);

CREATE TABLE ops.mel_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL, ata_chapter VARCHAR(2), item_description VARCHAR(255),
    category VARCHAR(10) NOT NULL, -- CAT_A/B/C/D
    deferral_deadline TIMESTAMPTZ, procedure_o TEXT, procedure_m TEXT,
    status VARCHAR(20) DEFAULT 'OPERACIONAL',
    da_applicable BOOLEAN DEFAULT FALSE, ledger_block_id UUID
);

CREATE TABLE ops.aircraft_flight_logs ( -- diário técnico da AERONAVE (CIV do piloto fica no Núcleo)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL, entry_date DATE NOT NULL,
    departure VARCHAR(10), arrival VARCHAR(10), takeoff TIMESTAMPTZ, landing TIMESTAMPTZ,
    pic_id UUID, -- apenas referência (pessoa do Núcleo)
    hours_cell DECIMAL(15,2) NOT NULL, cycles_cell INT NOT NULL,
    hours_eng1 DECIMAL(15,2) DEFAULT 0, cycles_eng1 INT DEFAULT 0,
    hours_eng2 DECIMAL(15,2) DEFAULT 0, cycles_eng2 INT DEFAULT 0,
    hours_prop1 DECIMAL(15,2) DEFAULT 0, hours_prop2 DECIMAL(15,2) DEFAULT 0,
    hours_apu DECIMAL(15,2) DEFAULT 0, cycles_apu INT DEFAULT 0,
    discrepancies TEXT, status VARCHAR(20) DEFAULT 'draft',
    content_hash VARCHAR(64), ledger_block_id UUID
);

CREATE TABLE ops.dispatch_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_number VARCHAR(20), aircraft_id UUID NOT NULL,
    departure VARCHAR(10), destination VARCHAR(10), alternates JSONB DEFAULT '[]',
    flight_rule VARCHAR(5), is_night BOOLEAN DEFAULT FALSE,
    fuel_required_minutes INT, fuel_planned_minutes INT,
    fuel_valid BOOLEAN DEFAULT FALSE, weight_balance_valid BOOLEAN DEFAULT FALSE,
    met_valid BOOLEAN DEFAULT FALSE, mel_items_valid BOOLEAN DEFAULT FALSE,
    crew_qualification_valid BOOLEAN DEFAULT FALSE,
    doo_id UUID NOT NULL, doo_signature_id UUID,
    status VARCHAR(20) DEFAULT 'RASCUNHO', ledger_block_id UUID
);

CREATE TABLE ops.crew_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID REFERENCES ops.dispatch_releases(id),
    user_id UUID NOT NULL, -- pessoa do Núcleo
    function VARCHAR(10) NOT NULL, -- PIC/SIC/COMIS/MEC/DOO
    qualification_valid BOOLEAN DEFAULT FALSE, checked_at TIMESTAMPTZ
);

CREATE TABLE ops.maintenance_control ( -- v2: alimentado automaticamente pelo APRS
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL,
    task_type VARCHAR(50) NOT NULL,           -- programada, DA, MEL, TBO, CVA...
    last_performed_at DATE NOT NULL,          -- data da liberação APRS
    next_due_hours DECIMAL(15,2), next_due_cycles INT, next_due_date DATE,
    remaining_hours DECIMAL(15,2), remaining_cycles INT, remaining_days INT,
    source_aprs_id UUID,                      -- liberação que alimentou
    ledger_block_id UUID, updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.1 Entidades do PPSP (RBAC 120 — movidas da parte 4 v2 §4.2)

```sql
-- SCHEMA: identity (PPSP) — usa o Cadastro Central de Pessoas como fonte única
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

## 6. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. **Validação RAB (v2):** cadastro de aeronave só é concluído com `rab_validated = TRUE` (matrícula ↔ titular no RAB); divergência bloqueia (BRE `AIRCRAFT_RAB_MISMATCH`). Fonte: RAB via scraping (sem API oficial) — circuit breaker se indisponível.
2. **MEL:** item vencido bloqueia voo; categorias A/B/C/D com prazos; **DA prevalece sobre MEL**.
3. **Combustível VFR 135:** avião +30 min (dia)/+45 min (noite); helicóptero +20 min. **IFR sem alternativa:** 2 h sobre o destino.
4. **Margem de desempenho sem met:** temp. máx. prevista (±3h) + 4 °C; **PAADV:** +5 °C / -5 hPa / variação >1%.
5. **Repeso da frota:** 36 meses (até 9 assentos); vencido bloqueia.
6. **Despacho bloqueado** se faltar combustível, item MEL/DA pendente **ou tripulação sem qualificação válida** (licença/CMA/recenticidade/treinamentos consultados no Núcleo).
7. **CVA:** 365 dias; alerta 30 dias; não conformidade crítica bloqueia.
8. **ETOPS:** validação por tempo de desvio homologado; retenção 207 min/5 anos.
9. **Relatório mensal ANAC:** dia 15; **semestrais examinador 135:** março/setembro; **PSF:** 30 dias fatais; **ROP:** 10 dias; **FOP:** 30 dias.
10. **Diário técnico da aeronave:** status draft/signed/rectified/voided; atualiza horas/ciclos acumulados da frota.
11. **Controle de manutenção (v2):** a liberação APRS (do ERP Manutenção ou da manutenção de linha) **alimenta automaticamente** o controle — nova disponibilidade de horas/ciclos/pousos/tempo-calendário, com data (há tarefas que vencem por calendário). Serviços adiantados atualizam o mapa; o histórico de serviços permanece no ledger.
12. **Manuais com recortes de Publicações (v2):** consulta ao manual via recorte conforme assinatura (idem Parte 07 — ERP Manutenção).
13. **CIV/CMA:** nunca criados aqui — o ERP consulta o Núcleo; evento FLIGHT_CLOSED apenas pré-preenche rascunho na CIV.
14. **PPSP (RBAC 120) — serviço deste ERP:**
    - Validade do exame toxicológico de janela longa: **90 dias** (alerta 15 dias antes).
    - Exame vencido → bloqueio da função crítica (ARSO).
    - Sorteio aleatório inopinado: mínimo de **25% do efetivo ARSO testado por ano** (algoritmo auditável, semente ancorada no ledger).
    - Resultado positivo → **afastamento imediato e irrevogável**, notificação ao Gestor do PPSP.
    - Substâncias rastreadas: álcool etílico, canabinoides, cocaína, opiáceos, anfetaminas, fenciclidina (Portaria 344/98).
    - Registro imutável no ledger (ID 120.17).
15. **Sem duplicação:** nenhuma tabela de pessoa no schema `ops`.
16. **Vagas do RH** (externas/internas) criadas aqui → Recrutamento; contratação cria vínculo automático — **sem comissão**.

## 7. ENDPOINTS DA API (resumo)

- Comercial: `/api/v1/ops/opportunities`, `/proposals`, `/contracts`
- Frota: `/api/v1/ops/operator-fleet`, `/reweigh`, `/api/v1/ops/fleet/:id/validate-rab` (v2)
- MEL: `/api/v1/ops/mel-items`, `/:id/defer`
- Diário técnico: `/api/v1/ops/aircraft-flight-logs`
- Despacho: `/api/v1/ops/dispatch-releases` + `/:id/validate` + `/:id/release`
- Controle de manutenção: `/api/v1/ops/maintenance-control` (v2 — leitura e atualização via evento APRS)
- Tripulação: `/api/v1/ops/crew-qualification/:user_id` (leitura do Núcleo)
- Manuais: `/api/v1/ops/operational-manuals` (+ recortes de Publicações)
- PPSP (v3, ex-parte 4 §4.4): `POST /arso-personnel` · `GET /arso-personnel` · `POST /toxicological-exams` · `GET /toxicological-exams` · `GET /arso-personnel/expiring` · `POST /arso-personnel/:id/random-test`
- RH/vagas: `/api/v1/ops/job-postings`
- Dashboard: `/api/v1/ops/dashboard`

## 8. FRONTEND ANGULAR

- Feature-lib `feature-ops` na SPA única da Shell (Opção A — lazy loading; `loadChildren` por feature-lib; module boundaries previstos para desmembramento futuro — seção 7 do CLAUDE.md v2).
- Padrões v2 obrigatórios: **signals, standalone components, inject(), @if/@for**; Angular Material + Design System próprio (`@vortex/ui` com **ValidationBadge** N0–N3 e **LedgerTimeline**).
- Barra superior global: Central de Comunicação (Chat · Alertas · E-mails · Comunicados Oficiais) + Tema (3 estados).
- Sidebar gerada por permissão; guards de permissão (UX) + validação no backend (verdade).
- Telas: dashboard `[KPIs frota/despacho/conformidade]`; frota `[lista → detalhe com validação RAB]`; despacho `[lista → validação → release]`; diário técnico `[lançamentos → [timeline]]`; tripulação `[escalas; qualificação via núcleo]`; manuais `[MGO/AOM/MCmsV/MGM/PTO]` + recortes de Publicações; controle de manutenção `[programada | DA | MEL — atualizado pelo APRS]`; PPSP `[ARSO → exames → sorteio]`.

## 9. TESTES OBRIGATÓRIOS

1. **Validação RAB:** matrícula divergente do titular bloqueia o cadastro; coincidente libera; RAB indisponível → circuit breaker (cadastro pendente, não bloqueado para sempre).
2. MEL vencido/DA pendente bloqueia voo.
3. Combustível abaixo do mínimo bloqueia despacho (VFR e IFR).
4. Margem de desempenho +4 °C e PAADV aplicados.
5. Repeso vencido (36 meses) bloqueia.
6. CVA vencido bloqueia; alerta 30 dias.
7. Despacho consulta licença/CMA/recenticidade/treinamentos no Núcleo; pendência bloqueia.
8. FLIGHT_CLOSED gera rascunho de CIV no Núcleo; sem confirmação do piloto não vira assinado.
9. **APRS alimenta o controle de manutenção:** liberação atualiza horas/ciclos/pousos/tempo-calendário restantes; serviços adiantados refletem no mapa; histórico permanece no ledger.
10. Diário técnico atualiza horas/ciclos da frota.
11. Nenhuma tabela de pessoa (CIV/CMA/licença) no schema `ops`.
12. Vaga interna visível só para funcionário com vínculo ativo (via Recrutamento).
13. Ancoragem: despacho, diário técnico e MEL geram blocos no ledger.
14. **PPSP (ex-parte 4):** exame toxicológico vencido (90 dias) bloqueia função ARSO.
15. **PPSP:** algoritmo de sorteio aleatório auditável e ancorado no ledger (≥25%/ano).
16. **PPSP:** resultado positivo bloqueia irrevogavelmente (afastamento imediato).

## 10. CRITÉRIOS DE ACEITE

- [ ] CRM/fretamento (pipeline → proposta → contrato), departamentos Operações e Manutenção completos.
- [ ] Despacho completo (combustível, met, P&B, MEL, tripulação via Núcleo) com bloqueios corretos.
- [ ] **Validação RAB** no cadastro de aeronave, com circuit breaker.
- [ ] **Controle de manutenção alimentado automaticamente pela liberação APRS.**
- [ ] CIV/CMA no Núcleo — nunca criados neste ERP.
- [ ] **Módulo PPSP (RBAC 120)** com ARSO, exames toxicológicos de 90 dias, sorteio ≥25%/ano e afastamento imediato por positivo — operando como serviço do ERP Operadores.
- [ ] Camada administrativa geral (com Contabilidade de dupla entrada) operando.
- [ ] Vagas integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (`feature-ops`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.

## 11. MAPA DE MÓDULOS

Decomposição futura em pedaços menores — cada MÓDULO com suas SEÇÕES previstas:

1. **MÓDULO 05.1 — Fundação e Aderência** (seções: objetivo; aderência ao Núcleo/ledger; fundamentação RBAC 91/119/121/135; assinatura ERP_OPERADORES)
2. **MÓDULO 05.2 — Comercial/CRM** (seções: pipeline de fretamento/charters; propostas; contratos/clientes; integração com o app Fretamento)
3. **MÓDULO 05.3 — Frota** (seções: cadastro de aeronave com validação RAB + circuit breaker; contratos/leasing; custos; repeso 36 meses)
4. **MÓDULO 05.4 — Despacho** (seções: liberações de voo; validações combustível/met/P&B/MEL; tripulação via Núcleo; DOV e assinatura; bloqueios)
5. **MÓDULO 05.5 — Diário técnico da aeronave** (seções: lançamentos horas/ciclos célula/motor/hélice/APU; discrepâncias; MEL/CDL; status draft/signed/rectified/voided; FLIGHT_CLOSED → rascunho de CIV)
6. **MÓDULO 05.6 — Tripulação** (seções: escalas; consulta licenças/CMA/recenticidade/treinamentos no Núcleo)
7. **MÓDULO 05.7 — Manuais e Recortes de Publicações** (seções: MGO/AOM/MCmsV/MGM/PTO/SOP; consulta via recorte conforme assinatura de Publicações (Parte 14))
8. **MÓDULO 05.8 — Manutenção de linha e Controle de manutenção** (seções: solicitações; OS da frota; alimentação automática pelo APRS; mapa programada/DA/MEL/TBO/CVA)
9. **MÓDULO 05.9 — Suprimentos técnicos e Compras** (seções: peças da frota via catálogo do Núcleo; ferramentas; pedidos/fornecedores)
10. **MÓDULO 05.10 — Qualidade/SGSO** (seções: não conformidades; perigos; relatórios; IS 121-1225-001)
11. **MÓDULO 05.11 — PPSP (RBAC 120)** (seções: ARSO — funções e cadastro; exames toxicológicos 90 dias; sorteio ≥25%/ano auditável; afastamento por positivo; educação/treinamento; registros no ledger 120.17)
12. **MÓDULO 05.12 — Relatórios ANAC** (seções: mensal dia 15; semestrais examinador março/setembro; FOP/PSF/ROP)
13. **MÓDULO 05.13 — RH interno e Vagas** (seções: funcionários via vínculo do Núcleo; treinamentos da empresa; vagas → Recrutamento sem comissão)
14. **MÓDULO 05.14 — Camada administrativa geral** (seções: RH; Financeiro; Contabilidade de dupla entrada; Compras)
15. **MÓDULO 05.15 — Frontend feature-ops** (seções: rotas e lazy loading; ValidationBadge/LedgerTimeline; telas por menu; padrões signals/standalone/inject/@if/@for)
16. **MÓDULO 05.16 — Testes e Critérios de Aceite** (seções: testes 1–16; checklist de aceite)

## 12. FONTES v2

- `artifacts/vortex-v2/docs/prompts/parte-6.md` — PARTE A (ERP Operadores 91/119/121/135), seções A1–A8 (conteúdo verbatim: objetivo, aderência, fundamentação, menus, schemas `ops`, regras, endpoints, testes) e PARTE C (critérios de aceite comuns).
- `artifacts/vortex-v2/docs/prompts/parte-4.md` — §4 (RBAC 120 — PPSP): fundamentação 120.1–120.23 + IS 120-002D, entidades `identity.arso_personnel`/`identity.toxicological_exams`, regras (90 dias, sorteio 25%, afastamento), endpoints e testes 7–9 (movidos para este app na v3).
- `artifacts/vortex-v2/CLAUDE.md` — seção 4 (modelo em camadas: 4.2 departamentos Operações/Manutenção, 4.3 Recrutamento sem comissão, 4.4 CRM por ERP, 4.5 estoque bidirecional), seção 5-A (ledger), seção 11 (app 6 — ops.vortex.com, assinatura, 91/119/121/135).
- `artifacts/vortex-v2/docs/10-navegacao-por-app.md` — seção 6 (ERP OPERADORES ops.vortex.com: árvore de menus nível-clique), seção 0 (Shell) e seção 15 (regras de navegação).
- `artifacts/vortex-v2/docs/09-mapa-adaptacao-vortex.md` — seção 4.5 (ERP Operadores — 2 departamentos, menus detalhados) e tabela CRM (Operadores: fretamento/charters, app Fretamento conduz a venda).
