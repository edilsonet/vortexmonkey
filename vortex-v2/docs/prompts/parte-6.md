# VORTEX — PARTE 6/10 (v2): ERP OPERADORES (91/119/121/135) E ERP AGRÍCOLA (137)

> **Versão 2 — 12/09/2026.** Reformulada: **ERP Agrícola (137) desmembrado em aplicativo próprio** (decisão 12/09/2026), pessoas vindas do **Núcleo** (não mais da Rconta), validação **RAB** no cadastro de aeronave, controle de manutenção alimentado automaticamente pela liberação APRS, caderneta com o princípio "registro é um só", e frontend Angular.
> **Instrução ao agente de código:** engenheiro sênior em operações aéreas, despacho, MEL, diário técnico de aeronave, RBAC 91/119/121/135, aeroagrícola (RBAC 137) e integração com ERPs. Construa os dois ERPs do VORTEX com rigor, TypeScript estrito, migrações SQL e testes. Execute completo.

---

# PARTE A — ERP OPERADORES (91/119/121/135)

## A1. OBJETIVO
1. **Comercial/CRM do domínio** (fretamento, charters, contratos de operação — venda conduzida pelo app Fretamento).
2. **Departamento Operações**: frota, despacho, diário técnico da aeronave, MEL, manuais, tripulação (validada pelo Núcleo), relatórios ANAC.
3. **Departamento Manutenção**: manutenção de linha da frota, controle de manutenção (alimentado pelo APRS), suprimentos técnicos.
4. **Camada administrativa geral** (RH, Financeiro, Contabilidade de dupla entrada, Compras) + RH interno + PPSP + Vagas.
5. **Frontend Angular** (feature-lib `feature-ops`).

## A2. ADERÊNCIA À ARQUITETURA CENTRAL
- **Dados de PESSOA vivem no Núcleo (Cadastro Central):** CIV, CMA, licenças/habilitações (RBAC 61/63/65), cursos, treinamentos, experiência, vínculos.
- **Dados de AERONAVE/operação vivem neste ERP:** frota, diário técnico da aeronave (célula/motor/hélice/APU), MEL, despacho, manuais.
- O ERP **nunca** cria CIV/CMA; o despacho **consulta o Núcleo** para validar tripulação (licença ativa, CMA válido, recenticidade, treinamentos vigentes).
- Evento `FLIGHT_CLOSED` permite ao Núcleo **pré-preencher rascunho** na CIV do piloto (registro assinado só após confirmação do piloto).
- Estoque usa o catálogo do Núcleo; custódia do estoque empresarial migra para o ERP contratado.
- Toda operação gera bloco no Ledger (`origin_app = ERP_OPERADORES`); Recrutamento consome as vagas do RH deste ERP.

## A3. FUNDAMENTAÇÃO REGULATÓRIA
- RBAC 91 (MEL IS 91-012, CVA IS 91-403-001, TBO, monitoramento de motores, aprovações PBN/EFB/RVSM/CAT II/III etc.), RBAC 119 (certificação em 5 fases), RBAC 121 (despacho, ETOPS, MCmsV, UPRT, MGM/PMAC, SGSO IS 121-1225-001), RBAC 135 (MGO, aeromédico, ambiente hostil, repeso 36 meses). CIV/CMA: RBAC 61/IS 61-001G e RBAC 67 (no Núcleo).
- **Validação RAB (v2):** no cadastro de aeronave, a matrícula é confrontada com a base pública do RAB — o operador/proprietário cadastrado deve coincidir com o titular no RAB (nome + CPF/CNPJ). Divergência → cadastro bloqueado (regra `AIRCRAFT_RAB_MISMATCH` do BRE).

## A4. ESTRUTURA DE MENUS
### A4.1 Departamento Operações
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Pipeline de fretamento/charters → Propostas → Contratos/Clientes (venda conduzida pelo app Fretamento) |
| **Frota** | Aeronaves (**validação RAB**) · Contratos/leasing · Custos · Repeso (36 meses) |
| **Despacho** | Liberações de voo: combustível, met, P&B, MEL, tripulação (via Núcleo) · DOV |
| **Diário técnico da aeronave** | Lançamentos de voo (horas/ciclos célula/motor/hélice/APU) · Discrepâncias · MEL/CDL |
| **Tripulação** | Escalas · Validação de licenças/CMA/recenticidade (leitura do Núcleo) |
| **Manuais** | MGO · AOM · MCmsV · MGM · PTO · SOP (aprovação ANAC) · **Recortes de Publicações (v2)** |
| **Relatórios ANAC** | Mensal dia 15 · Semestrais (examinadores março/setembro) · FOP/PSF/ROP |

### A4.2 Departamento Manutenção
| Menu | Conteúdo |
|------|----------|
| **Manutenção de linha** | Solicitações · Ordens de manutenção da frota |
| **Controle de manutenção** | Cumprimento de manutenção programada · DA · MEL deferidos — **atualizado automaticamente pela liberação APRS (v2)** |
| **Suprimentos técnicos** | Peças da frota (catálogo do Núcleo) · Ferramentas |
| **Compras** | Pedidos · Fornecedores |
| **Qualidade/SGSO** | Não conformidades · Perigos · Relatórios |

### A4.3 Camada administrativa geral + RH interno
RH · Financeiro · Contabilidade (dupla entrada) · Compras (uso geral) · RH interno (funcionários via vínculo do Núcleo; treinamentos da empresa; PPSP/RBAC 120) · **Vagas (v2 → Recrutamento)** · Relatórios · Configuração.

## A5. ENTIDADES PRINCIPAIS (schema `ops`)
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

## A6. REGRAS DE NEGÓCIO OBRIGATÓRIAS
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
12. **Manuais com recortes de Publicações (v2):** consulta ao manual via recorte conforme assinatura (idem Parte 5).
13. **CIV/CMA:** nunca criados aqui — o ERP consulta o Núcleo; evento FLIGHT_CLOSED apenas pré-preenche rascunho na CIV.
14. **PPSP (RBAC 120):** ARSO com exame toxicológico de 90 dias; vencido bloqueia função; sorteio ≥25%/ano; positivo afasta (Parte 4).
15. **Sem duplicação:** nenhuma tabela de pessoa no schema `ops`.
16. **Vagas do RH** (externas/internas) criadas aqui → Recrutamento; contratação cria vínculo automático — **sem comissão**.

## A7. ENDPOINTS (resumo)
- Comercial: `/api/v1/ops/opportunities`, `/proposals`, `/contracts`
- Frota: `/api/v1/ops/operator-fleet`, `/reweigh`, `/api/v1/ops/fleet/:id/validate-rab` (v2)
- MEL: `/api/v1/ops/mel-items`, `/:id/defer`
- Diário técnico: `/api/v1/ops/aircraft-flight-logs`
- Despacho: `/api/v1/ops/dispatch-releases` + `/:id/validate` + `/:id/release`
- Controle de manutenção: `/api/v1/ops/maintenance-control` (v2 — leitura e atualização via evento APRS)
- Tripulação: `/api/v1/ops/crew-qualification/:user_id` (leitura do Núcleo)
- Manuais: `/api/v1/ops/operational-manuals` (+ recortes de Publicações)
- RH/vagas: `/api/v1/ops/job-postings`
- Dashboard: `/api/v1/ops/dashboard`

## A8. TESTES OBRIGATÓRIOS (ERP Operadores)
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

---

# PARTE B — ERP AGRÍCOLA (137) — aplicativo próprio (v2)

## B1. OBJETIVO
1. **Comercial/CRM do domínio** (serviços aeroagrícolas — venda conduzida pelo app Fretamento/agrícola).
2. **Operador aeroagrícola**: CDAG, FCDAG, RT.
3. **Frota aeroagrícola**: aeronaves + dispersores + DGPS.
4. **Operações**: planejamento de aplicação, EMC, registro georreferenciado de faixas.
5. **SGSO aeroagrícola**: perigos/riscos (3 cenários), biblioteca de perigos, relatórios.
6. **Camada administrativa geral** + RH interno + Vagas.
7. **Frontend Angular** (feature-lib `feature-agri`).

## B2. ADERÊNCIA À ARQUITETURA CENTRAL
- Operador aeroagrícola é `identity.companies` com certificado CDAG_137; RT é pessoa do Núcleo com vínculo aprovado.
- Aeronaves com validação RAB (idem Parte A); dispersores e DGPS são ativos deste ERP.
- Toda aplicação, calibração e ocorrência gera bloco no Ledger (`origin_app = ERP_AGRICOLA`).
- Vagas do RH → Recrutamento (sem comissão).

## B3. FUNDAMENTAÇÃO REGULATÓRIA
- RBAC 137 + IS 137-001 (dispersores, EMC, disjuntores, helicópteros), IS 137-002 (DGPS, Declaração de Conformidade de Instalação), IS 137-003 (CDAG, FCDAG, 3 iterações, desistência 30 dias, suspensão 30 dias, cassação 360 dias), IS 137.201-001 (etanol hidratado), IS 137.215-001 (SGSO aeroagrícola, 3 cenários, biblioteca de perigos).

## B4. ESTRUTURA DE MENUS
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

## B5. ENTIDADES PRINCIPAIS (schema `agri`)
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

## B6. REGRAS DE NEGÓCIO (ERP Agrícola)
1. **CDAG:** 3 iterações de análise (Etapa I); inércia 30 dias → desistência tácita; vacância do RT 30 dias → suspensão cautelar; suspensão 360 dias → cassação sumária.
2. **Dispersor com calibração vencida** → bloqueia uso (alerta BLOCKING).
3. **DGPS** exige Declaração de Conformidade de Instalação válida.
4. **EMC** testado e registrado; disjuntores conforme IS 137-001.
5. **Registro georreferenciado** de faixas de aplicação obrigatório (GeoJSON no evento do ledger).
6. **SGSO aeroagrícola:** 3 cenários + biblioteca de perigos (IS 137.215-001).
7. **Validação RAB** nas aeronaves (idem Parte A).
8. **Sem duplicação:** nenhuma tabela de pessoa no schema `agri`.
9. **Vagas** → Recrutamento (sem comissão).

## B7. TESTES OBRIGATÓRIOS (ERP Agrícola)
1. CDAG: 3 iterações; desistência tácita em 30 dias; suspensão cautelar por vacância do RT; cassação após 360 dias.
2. Dispersor com calibração vencida bloqueia uso.
3. DGPS sem Declaração de Conformidade bloqueia operação.
4. Registro de aplicação sem georreferência é rejeitado.
5. Validade RAB nas aeronaves.
6. SGSO: 3 cenários registráveis; biblioteca de perigos consultável.
7. Ancoragem: aplicação, calibração e CDAG geram blocos no ledger.

---

# PARTE C — CRITÉRIOS DE ACEITE COMUNS (PARTE 6)
- [ ] ERP Operadores: CRM/fretamento (pipeline → proposta → contrato), departamentos Operações e Manutenção, despacho completo, **validação RAB**, **controle de manutenção alimentado pelo APRS**, CIV/CMA no Núcleo.
- [ ] ERP Agrícola: **app próprio** com CDAG/dispersores/DGPS/SGSO aeroagrícola.
- [ ] Camadas administrativas gerais (com Contabilidade de dupla entrada) operando nos dois.
- [ ] Vagas integradas ao Recrutamento; sem duplicação de pessoa; sem comissão.
- [ ] Frontend Angular (feature-libs `feature-ops` e `feature-agri`) conforme padrões v2.
- [ ] Testes verdes e lacunas listadas.
