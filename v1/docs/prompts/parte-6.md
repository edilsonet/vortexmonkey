# VORTEX — PARTE 6/8: ERP 91/121/135/137 — OPERADORES AÉREOS E AEROAGRÍCOLA

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em operações aéreas (RBAC 91, 119, 121, 135, 137), despacho operacional, MEL, logbook digital, manuais operacionais e operações aeroagrícolas. Construa o ERP de Operadores do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 6

Entregar o módulo completo de operadores aéreos:
1. **RBAC 91:** MEL, CVA, TBO, monitoramento de motores, aprovações operacionais (PBN, EFB, RVSM, CAT II/III).
2. **RBAC 119:** certificação de operadores em 5 fases (COA/EO).
3. **RBAC 121:** transporte regular — despacho, manuais, ETOPS, MCmsV, UPRT, MGM/PMAC.
4. **RBAC 135:** táxi aéreo — MGO, aeromédico, ambiente hostil, repeso.
5. **RBAC 137:** aeroagrícola — CDAG, dispersores, DGPS, SGSO.
6. **Logbook digital** (vortex_logbook_entries) — schema canônico completo.

## 2. FUNDAMENTAÇÃO REGULATÓRIA

- **RBAC 91:** MEL (IS 91-012), CVA (IS 91-403-001), TBO (IS 91-409-001), monitoramento de motores (IS 91-409-002), PBN (IS 91-001), EFB (IS 91-002), RVSM (IS 91-005), ILS CAT I AR/LVTO (IS 91-003), CAT II/III (IS 91-004), NAT-HLA (IS 91-006), SAE (IS 91-007), eventos aéreos (IS 91-008), crédito de pavimento (IS 91-009), CPDLC/ADS-C (IS 91-010), EFVS (IS 91-011), propriedade compartilhada (IS 91-013), fatoração de pista (IS 91-014), reconstituição de diários (IS 91-015), PED a bordo (IS 91.21-001), sobrevoo experimental (IS 91-319-001).
- **RBAC 119:** certificação em 5 fases (IS 119-001), qualificação pessoal (119.69/119.71), certificação 135 (IS 119-004) com Simples/Padrão, FOP 200-226, PSF 30 dias, ROP 10 dias, FAI.
- **RBAC 121:** guia de rotas (IS 121-001), SOP (IS 121-003), AOM (IS 121-004), PTO/LOFT (IS 121-006/007/008), sobrevivência (IS 121-009), sistema de documentos (IS 121-010), PTO comissários (IS 121-011), ETOPS (IS 121-012), estações de linha (IS 121-013), MCmsV 25 tópicos (IS 121-014), evacuação 90s (IS 121-015), mínimos meteorológicos (IS 121-016/017), mínimos de aeródromo/LVTO (IS 121-018/019), aeródromos especiais (IS 121-020), UPRT (IS 121-021), FAD (IS 121-022), INSPAC (IS 121-023), MGM/PMAC (IS 121-024), controle operacional (IS 121-025), SGSO (IS 121-1225-001), examinadores (IS 121-002), desempenho Subparte I.
- **RBAC 135:** piloto examinador (IS 135-001), MGO (IS 135-002), PTO (IS 135-003), comissário examinador (IS 135-004), aeromédico (IS 135-005), ambiente hostil (IS 135-006), meios alternativos de desempenho (IS 135-007), SOP (IS 135-008), AOM 135 (IS 135-009), MGM até 9 assentos (IS 135-21-001), manual 35 seções (135.23), verificação no diário (135.71), traslado técnico (135.179), confiabilidade (135.415), interrupção (135.417), manutenção até 9 assentos (135.421).
- **RBAC 137:** dispersores (IS 137-001), DGPS (IS 137-002), CDAG (IS 137-003), etanol hidratado (IS 137.201-001), SGSO aeroagrícola (IS 137.215-001).

## 3. ENTIDADES DO ERP DE OPERADORES

### 3.1 Operador e certificação
```sql
-- SCHEMA: ops
CREATE TABLE ops.air_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    operator_type VARCHAR(50) NOT NULL, -- RBAC_91, RBAC_121, RBAC_135, RBAC_137
    coa_number VARCHAR(100), -- Certificado de Operador Aéreo
    coa_validity TIMESTAMPTZ,
    classification VARCHAR(50), -- SIMPLES, PADRAO (RBAC 135)
    eo_number VARCHAR(100), -- Especificações Operativas
    certification_phase VARCHAR(50) NOT NULL DEFAULT 'FASE_1'
      CHECK (certification_phase IN ('FASE_1','FASE_2','FASE_3','FASE_4','FASE_5','CERTIFICADO')),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Frota e aeronaves
```sql
CREATE TABLE ops.operator_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES ops.air_operators(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    registration VARCHAR(10) NOT NULL,
    model VARCHAR(100) NOT NULL,
    max_passengers INT,
    max_takeoff_weight_kg NUMERIC(10,2),
    last_reweigh_date DATE, -- repeso 36 meses (IS 135-21-001)
    next_reweigh_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 MEL (Lista de Equipamentos Mínimos)
```sql
CREATE TABLE ops.mel_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    ata_chapter VARCHAR(2) NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- CAT_A, CAT_B, CAT_C, CAT_D
    deferral_deadline TIMESTAMPTZ,
    procedure_o TEXT, -- Procedimento Operacional
    procedure_m TEXT, -- Procedimento de Manutenção
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','DIFERIDO','EXPIRADO','REPARADO')),
    da_applicable BOOLEAN NOT NULL DEFAULT FALSE, -- DA prevalece sobre MEL
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Logbook digital (schema canônico completo — vortex_logbook_entries)
```sql
CREATE TABLE ops.logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    entry_type VARCHAR(20) NOT NULL, -- flight, ground_run
    entry_date DATE NOT NULL,
    entry_time_utc TIMESTAMPTZ NOT NULL,
    departure_aerodrome VARCHAR(10) NOT NULL, -- ICAO
    arrival_aerodrome VARCHAR(10) NOT NULL, -- ICAO
    block_off_time TIMESTAMPTZ,
    takeoff_time TIMESTAMPTZ NOT NULL,
    landing_time TIMESTAMPTZ NOT NULL,
    block_on_time TIMESTAMPTZ,
    flight_time_hours DECIMAL(15,2) NOT NULL,
    habilitacao VARCHAR(10) NOT NULL, -- IFRA, MLTE, MNTE, IFRH
    modelo VARCHAR(50) NOT NULL,
    pousos INTEGER DEFAULT 1 NOT NULL,
    diurno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    noturno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    navegacao DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    instrumento DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    capota DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    simulador DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    milhas_navegacao DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tpx BOOLEAN DEFAULT false NOT NULL,
    experimental BOOLEAN DEFAULT false NOT NULL,
    airframe_hours_increment DECIMAL(15,2) NOT NULL,
    airframe_cycles_increment INTEGER NOT NULL,
    engine_1_hours DECIMAL(15,2) DEFAULT 0.00,
    engine_1_cycles INTEGER DEFAULT 0,
    engine_2_hours DECIMAL(15,2) DEFAULT 0.00,
    engine_2_cycles INTEGER DEFAULT 0,
    propeller_1_hours DECIMAL(15,2) DEFAULT 0.00,
    propeller_2_hours DECIMAL(15,2) DEFAULT 0.00,
    apu_hours DECIMAL(15,2) DEFAULT 0.00,
    apu_cycles INTEGER DEFAULT 0,
    discrepancies TEXT,
    mel_cdl_reference VARCHAR(100),
    pilot_person_id UUID NOT NULL,
    pilot_name VARCHAR(255) NOT NULL,
    pilot_license VARCHAR(50) NOT NULL, -- CANAC
    pilot_funcao VARCHAR(50) NOT NULL, -- PIC, SIC, INSP, INSTR
    signature_timestamp TIMESTAMPTZ,
    signature_identity VARCHAR(255),
    signature_verified BOOLEAN DEFAULT false NOT NULL,
    signature_verification_data JSONB,
    attestation_text TEXT,
    endossado BOOLEAN DEFAULT false NOT NULL,
    endossado_por UUID,
    endossado_em TIMESTAMPTZ,
    dbe_enviado BOOLEAN DEFAULT false NOT NULL,
    dbe_enviado_em TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL, -- draft, signed, rectified, voided
    rectification_reason TEXT,
    voided_reason TEXT,
    content_hash VARCHAR(64),
    tenant_id UUID NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 3.5 Despacho operacional
```sql
CREATE TABLE ops.dispatch_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    flight_number VARCHAR(20),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    departure VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    alternates JSONB NOT NULL DEFAULT '[]',
    flight_rule VARCHAR(10) NOT NULL, -- VFR, IFR
    is_night BOOLEAN NOT NULL DEFAULT FALSE,
    fuel_required_minutes INT NOT NULL,
    fuel_planned_minutes INT NOT NULL,
    fuel_valid BOOLEAN NOT NULL DEFAULT FALSE,
    weight_balance_valid BOOLEAN NOT NULL DEFAULT FALSE,
    met_valid BOOLEAN NOT NULL DEFAULT FALSE,
    mel_items_valid BOOLEAN NOT NULL DEFAULT FALSE,
    doo_id UUID NOT NULL REFERENCES identity.users(id), -- Despachante Operacional de Voo
    doo_signature_id UUID REFERENCES signatures.signatures(id),
    status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO'
      CHECK (status IN ('RASCUNHO','VALIDADO','LIBERADO','BLOQUEADO','EXECUTADO')),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 Manuais operacionais
```sql
CREATE TABLE ops.operational_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    operator_id UUID NOT NULL REFERENCES ops.air_operators(id),
    manual_type VARCHAR(50) NOT NULL, -- MGO, AOM, MCMSV, MGM, PTO, SOP, MIP
    title VARCHAR(255) NOT NULL,
    current_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'MINUTA'
      CHECK (approval_status IN ('MINUTA','SUBMETIDO','APROVADO','ACEITO','REJEITADO','REVOGADO')),
    anac_process_number VARCHAR(100),
    content_hash VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.7 Aeroagrícola (RBAC 137)
```sql
CREATE TABLE ops.agri_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    cdag_number VARCHAR(100), -- Certificado de Operador Aeroagrícola
    cdag_validity TIMESTAMPTZ,
    technical_manager_id UUID REFERENCES identity.users(id), -- RT
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.dispersers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    disperser_type VARCHAR(50) NOT NULL, -- SOLIDOS, LIQUIDOS, GRANULARES
    calibration_expiry DATE,
    emc_test_done BOOLEAN NOT NULL DEFAULT FALSE,
    circuit_breakers JSONB NOT NULL DEFAULT '[]',
    dgps_installed BOOLEAN NOT NULL DEFAULT FALSE,
    dgps_conformity_declaration VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. **MEL:** item MEL vencido bloqueia o voo. Categorias: A (prazo especificado), B (3 dias/72h), C (10 dias/240h), D (120 dias).
2. **DA prevalece sobre MEL:** proibido relaxamento operacional se houver DA aplicável em aberto.
3. **Combustível VFR 135:** avião +30 min (dia)/+45 min (noite); helicóptero +20 min.
4. **Combustível IFR sem alternativa:** 2 horas sobre o destino (turboélice/jato).
5. **Margem de desempenho sem met:** temp. máx. prevista (±3h) + 4°C.
6. **Gatilhos PAADV:** +5°C, -5 hPa, variação >1%.
7. **Repeso de frota:** a cada 36 meses (até 9 assentos).
8. **Despacho bloqueado** se faltar combustível regulamentar ou item MEL/DA pendente.
9. **CVA:** 365 dias, alerta 30 dias antes; bloqueio se não conformidade crítica.
10. **ETOPS:** despacho validado conforme tempo de desvio homologado; retenção 207 min por 5 anos.
11. **Relatório mensal ANAC:** dia 15 de cada mês.
12. **Relatório semestral examinador 135:** março e setembro.
13. **PSF RBAC 135:** prazo fatal 30 dias sem dilação; ROP antecedência 10 dias.
14. **FOP 224:** 30 dias para saneamento.
15. **Adequação AOM:** 180 dias. **EGPWS:** 60 dias.
16. **Logbook:** status draft/signed/rectified/voided; assinatura obrigatória; endosso de instrutor; envio DBE.
17. **Aeroagrícola:** CDAG com 3 iterações, desistência 30 dias, suspensão 30 dias, cassação 360 dias; dispersor com calibração vencida bloqueia uso; DGPS exige Declaração de Conformidade.

## 5. ENDPOINTS DA API

- `POST /api/v1/air-operators`
- `GET /api/v1/air-operators`
- `POST /api/v1/operator-fleet`
- `GET /api/v1/operator-fleet`
- `POST /api/v1/mel-items`
- `GET /api/v1/mel-items`
- `POST /api/v1/mel-items/:id/defer` (diferir item)
- `POST /api/v1/logbook-entries`
- `GET /api/v1/logbook-entries`
- `POST /api/v1/logbook-entries/:id/sign`
- `POST /api/v1/logbook-entries/:id/endorse`
- `POST /api/v1/logbook-entries/:id/rectify`
- `POST /api/v1/logbook-entries/:id/void`
- `POST /api/v1/dispatch-releases`
- `GET /api/v1/dispatch-releases`
- `POST /api/v1/dispatch-releases/:id/validate`
- `POST /api/v1/dispatch-releases/:id/release` (liberar com assinatura DOV)
- `POST /api/v1/operational-manuals`
- `GET /api/v1/operational-manuals`
- `POST /api/v1/agri-operators`
- `GET /api/v1/agri-operators`
- `POST /api/v1/dispersers`
- `GET /api/v1/dispersers/expiring`
- `GET /api/v1/operators/dashboard` (KPIs)

## 6. TESTES OBRIGATÓRIOS DA PARTE 6

1. Teste de MEL: item vencido bloqueia o voo.
2. Teste de DA sobre MEL: DA pendente prevalece e bloqueia.
3. Teste de combustível VFR: reserva inferior ao mínimo bloqueia despacho.
4. Teste de combustível IFR: sem alternativa, exige 2 horas.
5. Teste de margem de desempenho: +4°C aplicado.
6. Teste de repeso: frota com repeso vencido (36 meses) bloqueia.
7. Teste de CVA: vencido bloqueia; alerta 30 dias.
8. Teste de ETOPS: despacho validado por tempo de desvio.
9. Teste de logbook: assinatura obrigatória; status draft/signed/rectified/voided.
10. Teste de endosso: instrutor endossa; envio DBE.
11. Teste de aeroagrícola: dispersor com calibração vencida bloqueia uso.
12. Teste de ancoragem: despacho, logbook e MEL geram blocos no ledger.
13. Teste de performance: validação de despacho em < 100ms.

## 7. CRITÉRIOS DE ACEITE DA PARTE 6

- [ ] Gestão de operadores (RBAC 91/119/121/135/137) com COA/EO.
- [ ] Certificação em 5 fases (RBAC 119).
- [ ] MEL com categorias A/B/C/D e DA prevalecendo.
- [ ] Logbook digital completo (vortex_logbook_entries).
- [ ] Despacho operacional com validação de combustível, met, P&B e MEL.
- [ ] Manuais operacionais (MGO, AOM, MCmsV, MGM, PTO).
- [ ] ETOPS, UPRT, aeromédico, ambiente hostil.
- [ ] Aeroagrícola (CDAG, dispersores, DGPS, SGSO).
- [ ] Todas as regras de negócio implementadas e testadas.
- [ ] Testes de aceite passando; lacunas listadas.