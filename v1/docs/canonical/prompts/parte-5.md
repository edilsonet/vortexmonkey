# VORTEX — PARTE 5/8: ERP 43+145 — MANUTENÇÃO AERONÁUTICA E ORGANIZAÇÕES DE MANUTENÇÃO

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em manutenção aeronáutica (RBAC 43 e 145), organizações de manutenção (OM), rastreabilidade de peças, ensaios não destrutivos, calibração metrológica e retorno ao serviço. Construa o ERP 43+145 do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 5

Entregar o módulo completo de manutenção aeronáutica:
1. **Gestão da OM** (RBAC 145): COM, EO, LC, MOM, SGSO, pessoal, instalações, equipamentos.
2. **Fluxo da oficina** (RBAC 43): OS, registros, CRS/APRS, cadernetas, rastreabilidade.
3. **Controle de ferramentas** (IS 43.13-005): calibração RBC/INMETRO.
4. **Ensaios Não Destrutivos** (IS 43.13-004): métodos e níveis.
5. **Diretrizes de Aeronavegabilidade** (RBAC 39): DA/FCDA.
6. **Fluxo comercial da oficina em 12 etapas** (do arquivo original).

## 2. FUNDAMENTAÇÃO REGULATÓRIA

- **RBAC 43:** validação de licença/habilitação/vínculo (43.3), manutenção preventiva com dados aprovados (43.5), trava de CRS/APRS sem assinatura (43.7), registros de manutenção (43.9), guarda de registros (43.11), vinculação a manuais AMM/SRM/CMM (43.13).
- **RBAC 145:** definições (145.3), COM (145.51), emissão (145.53a), categorias (145.59), EO (145.61-I), LC (145.65), pessoal (145.109), RT (145.109-001), GR (145.109), instalações (145.111), equipamentos (145.113), CRS (145.151), registros (145.163), treinamento (145.165), MOM (145.207/209), qualidade (145.211), inspeção (145.213), SGSO (145.214-I), subcontratação (145.217), relatórios (145.221).
- **IS 43-001 (Rastreabilidade), 43.9-001 (SEGVOO 001), 43.9-002 (Registros), 43.9-003 (Cadernetas), 43.13-003 (IIO), 43.13-004 (END), 43.13-005 (Ferramentas), 43-012 (Itens Inoperantes), 43-002 (Pessoal).**
- **RBAC 39:** DA, FCDA, AMOC.

## 3. ENTIDADES DO ERP 43+145

### 3.1 Organização de Manutenção (OM)
```sql
-- SCHEMA: ops
CREATE TABLE ops.maintenance_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    com_number VARCHAR(100) UNIQUE NOT NULL, -- Certificado de OM
    com_validity TIMESTAMPTZ,
    categories JSONB NOT NULL DEFAULT '[]', -- célula, motor, hélice, aviônicos, serviços
    eo_number VARCHAR(100), -- Especificações Operativas
    eo_version VARCHAR(20),
    lc_number VARCHAR(100), -- Lista de Capacidade
    mom_version VARCHAR(20), -- Manual da OM
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.maintenance_organization_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES ops.maintenance_organizations(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    role VARCHAR(50) NOT NULL, -- RT, GR, GERENTE_QUALIDADE, INSPETOR, TECNICO
    accreditation_number VARCHAR(100),
    accreditation_expiry TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Aeronaves e cadernetas
```sql
CREATE TABLE ops.aircraft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    registration VARCHAR(10) UNIQUE NOT NULL, -- PP-XXX
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    total_hours NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_cycles INT NOT NULL DEFAULT 0,
    airworthiness_status VARCHAR(50) NOT NULL DEFAULT 'AERONAVEGAVEL',
    certificate_number VARCHAR(100), -- CA/COA
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.aircraft_logbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    logbook_type VARCHAR(50) NOT NULL, -- CELULA, MOTOR, HELICE, COMPONENTE
    component_identification VARCHAR(100),
    entries JSONB NOT NULL DEFAULT '[]', -- horas, ciclos, intervenções, DAs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Ordens de Serviço (OS) e CRS
```sql
CREATE TABLE ops.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTA'
      CHECK (status IN ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECAS','AGUARDANDO_APROVACAO','CONCLUIDA','CANCELADA')),
    work_type VARCHAR(50) NOT NULL, -- PREVENTIVA, CORRETIVA, GRANDE_REPARO, GRANDE_ALTERACAO, INSPECAO, REVISAO
    is_major BOOLEAN NOT NULL DEFAULT FALSE,
    requires_segvoo BOOLEAN NOT NULL DEFAULT FALSE,
    technical_data_ref VARCHAR(100), -- AMM, SRM, CMM
    assigned_technician_id UUID REFERENCES identity.users(id),
    assigned_inspector_id UUID REFERENCES identity.users(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    crs_issued BOOLEAN NOT NULL DEFAULT FALSE,
    crs_signature_id UUID REFERENCES signatures.signatures(id),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.work_order_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES ops.work_orders(id),
    task_number VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ata_chapter VARCHAR(2),
    manual_ref VARCHAR(100), -- AMM/SRM/CMM
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    performed_by UUID REFERENCES identity.users(id),
    performed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Rastreabilidade de peças (almoxarifado)
```sql
CREATE TABLE ops.parts_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    part_number VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    condition VARCHAR(50) NOT NULL, -- NOVA, USADA_SERVICAVEL, USADA_NAO_SERVICAVEL, REVISADA, REPARADA
    tag VARCHAR(50) NOT NULL DEFAULT 'VERDE_SERVICAVEL'
      CHECK (tag IN ('VERDE_SERVICAVEL','AMARELA_REPARAVEL_INSPECAO','VERMELHA_CONDENADA_NAO_AERONAVEGAVEL')),
    certification_type VARCHAR(50) NOT NULL, -- TC, STC, TSO, PMA, OTP, PADRAO
    form_8130_3 VARCHAR(100), -- Certificado de liberação
    is_life_limited BOOLEAN NOT NULL DEFAULT FALSE,
    life_limit_hours NUMERIC(10,2),
    life_limit_cycles INT,
    shelf_life_months INT,
    shelf_life_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'EM_ESTOQUE'
      CHECK (status IN ('EM_ESTOQUE','QUARENTENA','RESERVADO','INSTALADO','DESCARTADO')),
    quarantine_reason TEXT,
    traceability JSONB NOT NULL DEFAULT '[]', -- origem, certificados, histórico
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 Ferramentas e calibração
```sql
CREATE TABLE ops.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    identification VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    calibration_required BOOLEAN NOT NULL DEFAULT FALSE,
    calibration_standard VARCHAR(50), -- RBC_INMETRO, FABRICANTE_OEM, PADRAO_RASTREAVEL_INTERNACIONAL
    calibration_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','CALIBRACAO_VENCIDA','EM_MANUTENCAO','BAIXADA')),
    tool_box_id UUID,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 Ensaios Não Destrutivos (END)
```sql
CREATE TABLE ops.non_destructive_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    work_order_id UUID REFERENCES ops.work_orders(id),
    method VARCHAR(50) NOT NULL, -- LIQUIDO_PENETRANTE, PARTICULAS_MAGNETICAS, ULTRASSOM, RADIOGRAFIA, EDDY_CURRENT, VISUAL
    inspector_id UUID NOT NULL REFERENCES identity.users(id),
    inspector_level VARCHAR(20) NOT NULL, -- NIVEL_I, NIVEL_II, NIVEL_III
    equipment_used VARCHAR(100),
    result VARCHAR(50) NOT NULL, -- APROVADO, REPROVADO, INCONCLUSIVO
    report_hash VARCHAR(64),
    signature_id UUID REFERENCES signatures.signatures(id),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.7 Diretrizes de Aeronavegabilidade (DA/FCDA)
```sql
CREATE TABLE ops.airworthiness_directives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    ad_number VARCHAR(100) NOT NULL,
    applicability VARCHAR(255),
    description TEXT,
    compliance_deadline DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','CUMPRIDA','NAO_APLICAVEL','REVOGADA')),
    amoc_approved BOOLEAN NOT NULL DEFAULT FALSE,
    fcda_hash VARCHAR(64),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. FLUXO COMERCIAL DA OFICINA EM 12 ETAPAS (do arquivo original)

Este é o fluxo completo da oficina, que deve ser implementado como máquina de estados vinculada à OS:

| Etapa | Descrição | Etiqueta |
|-------|-----------|----------|
| 1 | Pedido de Cotação | — |
| 2 | Pré-Orçamento | — |
| 3 | Aprovação do Cliente | — |
| 4 | Solicitação de Peças | — |
| 5 | Inspeção de Recebimento | 🟢/🟡/🔴 |
| 6 | Triagem de Complexidade | — |
| 7 | Abertura da OS | — |
| 8 | Execução | 🟢/🟡/🔴 |
| 9 | Fechamento Técnico APRS | — |
| 10 | Orçamento Final Consolidado | — |
| 11 | Geração de Documentos (CRS/SEGVOO) | — |
| 12 | Liquidação Financeira | — |

- **Etiqueta Verde:** peça aprovada / em estoque (servicável e documentada).
- **Etiqueta Amarela:** peça segregada / em quarentena (inspeção obrigatória).
- **Etiqueta Vermelha:** peça descartada / rejeitada (não aeronavegável / não documentada).

## 5. REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. OS não pode ser aprovada para retorno sem assinatura digital de profissional habilitado (RBAC 43.7).
2. Ferramenta com calibração vencida bloqueia o uso na OS (IS 43.13-005).
3. Peça com etiqueta vermelha bloqueia a instalação (IS 43-001).
4. DA aplicável pendente bloqueia o retorno ao serviço (RBAC 39).
5. Grande reparo/alteracao exige SEGVOO 001 antes do retorno (IS 43.9-001).
6. Peça sem FORM 8130-3 (nova) ou sem histórico (usada) fica em quarentena (IS 43-001).
7. Registros de manutenção retidos por 1 ano após a retirada definitiva de serviço (IS 43.9-002).
8. Cadernetas escrituradas digitalmente com horas, ciclos e DAs (IS 43.9-003).
9. END exige laudo assinado por inspetor qualificado (IS 43.13-004).
10. Instrutor/executor deve ter CHT ativa na habilitação aplicável (RBAC 43.3).
11. Toda OS, CRS, FCDA e SEGVOO gera transação no ledger.
12. Alertas preditivos: calibração vencendo (30 dias), DA vencendo (15 dias), retenção expirando.

## 6. ENDPOINTS DA API

- `POST /api/v1/maintenance-organizations`
- `GET /api/v1/maintenance-organizations`
- `POST /api/v1/aircraft`
- `GET /api/v1/aircraft`
- `GET /api/v1/aircraft/:id/logbooks`
- `POST /api/v1/work-orders`
- `GET /api/v1/work-orders`
- `GET /api/v1/work-orders/:id`
- `POST /api/v1/work-orders/:id/tasks`
- `POST /api/v1/work-orders/:id/close` (fechamento APRS + CRS)
- `POST /api/v1/work-orders/:id/segvoo-001`
- `POST /api/v1/parts-inventory`
- `GET /api/v1/parts-inventory`
- `POST /api/v1/parts-inventory/:id/quarantine`
- `POST /api/v1/tools`
- `GET /api/v1/tools/expiring`
- `POST /api/v1/non-destructive-tests`
- `POST /api/v1/airworthiness-directives`
- `GET /api/v1/airworthiness-directives`
- `POST /api/v1/airworthiness-directives/:id/comply` (FCDA)
- `GET /api/v1/maintenance/dashboard` (KPIs)

## 7. TESTES OBRIGATÓRIOS DA PARTE 5

1. Teste de bloqueio de CRS: OS sem assinatura de profissional habilitado não fecha.
2. Teste de calibração: ferramenta com calibração vencida bloqueia o uso na OS.
3. Teste de etiqueta vermelha: peça vermelha bloqueia a instalação.
4. Teste de DA: DA pendente bloqueia o retorno ao serviço.
5. Teste de SEGVOO 001: grande reparo exige SEGVOO antes do CRS.
6. Teste de quarentena: peça sem documentação fica em quarentena.
7. Teste de retenção: registros de manutenção retidos por 1 ano.
8. Teste de caderneta: lançamentos de horas/ciclos/DAs escriturados.
9. Teste de END: laudo assinado por inspetor qualificado.
10. Teste de fluxo 12 etapas: máquina de estados avança corretamente.
11. Teste de ancoragem: OS, CRS, FCDA e SEGVOO geram blocos no ledger.
12. Teste de performance: listagem de 10.000 peças com filtros em < 300ms.

## 8. CRITÉRIOS DE ACEITE DA PARTE 5

- [ ] Gestão da OM (COM, EO, LC, MOM, SGSO, pessoal).
- [ ] Fluxo da oficina em 12 etapas com etiquetas verde/amarela/vermelha.
- [ ] OS, registros, CRS/APRS e cadernetas.
- [ ] Rastreabilidade de peças com quarentena e FORM 8130-3.
- [ ] Controle de ferramentas com calibração RBC/INMETRO.
- [ ] END com métodos e níveis.
- [ ] DA/FCDA com AMOC.
- [ ] SEGVOO 001 com bloqueio de retorno.
- [ ] Todas as regras de negócio implementadas e testadas.
- [ ] Testes de aceite passando; lacunas listadas.