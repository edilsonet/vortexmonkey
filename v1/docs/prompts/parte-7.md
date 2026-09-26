# VORTEX — PARTE 7/8: ERP 141/142 + ERP 153 — INSTRUÇÃO, TREINAMENTO E AERÓDROMOS

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em centros de instrução de aviação civil (RBAC 141), centros de treinamento (RBAC 142), dispositivos de simulação de voo (RBAC 60), infraestrutura aeroportuária (RBAC 153), segurança operacional de aeródromos e gestão do risco de fauna. Construa o ERP 141/142 e o ERP 153 do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 7

Entregar dois módulos:
1. **ERP 141/142 (Instrução e Treinamento):** CIAC (RBAC 141) com integração S141, e CTAC (RBAC 142) com FSTD e SGQ.
2. **ERP 153 (Aeródromos):** infraestrutura, SOCMS, RWYCC/RCR, SESCINC, fauna (SIGRA), SGSO.

## 2. FUNDAMENTAÇÃO REGULATÓRIA

### 2.1 RBAC 141 (CIAC)
- Certificado, EI, 3 tipos (Tipo 1 pilotos, Tipo 2 comissários, Tipo 3 mecânicos), MIP/MGQ, SGSO 4 componentes (retenção 5 anos), instalações, aeronaves com CA padrão, FSTD RBAC 60, corpo docente, estrutura administrativa (Gestor, Chefe de Instrução, Chefe de Treinamento), registros escolares, certificado em até 10 dias, examinadores 24 meses, transferência de créditos.
- IS 141-001 (S141): API, matrícula, 6 situações, status CIAC, instrutores, histórico, dobro do período letivo, transferência externa.
- IS 141-003 (curso DOV), IS 141-004 (certificação 5 fases, FOP 400-422, vacância 60 dias), IS 141-005 (Gestor/GSO, vistorias semestrais, SPIs, relatório semestral Res. 714), IS 141-006/007 (programas por modalidade, ground school 12 meses, fichas 5 anos, MMA em oficinas homologadas).

### 2.2 RBAC 142 (CTAC)
- Certificado, ET, 5 documentos (Certificado, ET, MIP, MGSO, PRE), programas homologados, FSTD RBAC 60, CTAC Satélite/Remoto/Estrangeiro, SGQ ISO 9001.
- IS 142-001 (certificação 5 fases, FOP-CT 101-125, 3 currículos), IS 142-002 (CTAC exterior, 30 dias), IS 142-003 (corpo docente, 10 tópicos, 8 horas pedagógicas, trava de redução).

### 2.3 RBAC 153 (Aeródromos)
- IS 153-001 (SOCMS), IS 153-002 (manutenção 8 áreas), IS 153.37-001 (PISOA), IS 153.51-001 (SGSO, relatório quadrimestral 20/01, 20/05, 20/09), IS 153.63-001/73-001 (PGSO/PESO), IS 153.107-001 (proteção da área operacional), IS 153.133-001 (RCAM/RWYCC/RCR), IS 153.203-001/205-001 (PCN, IRI, atrito, macrotextura), IS 153.403-001 a 433-001 (SESCINC), IS 153.501-001 a 505-001 (fauna, SIGRA).

## 3. ENTIDADES DO ERP 141/142

### 3.1 CIAC (RBAC 141)
```sql
-- SCHEMA: ops
CREATE TABLE ops.training_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    center_type VARCHAR(50) NOT NULL, -- CIAC, CTAC
    ciac_type VARCHAR(50), -- TIPO_1_PILOTOS, TIPO_2_COMISSARIOS, TIPO_3_MECANICOS
    certificate_number VARCHAR(100),
    certificate_validity TIMESTAMPTZ,
    ei_number VARCHAR(100), -- Especificações de Instrução (CIAC)
    et_number VARCHAR(100), -- Especificações de Treinamento (CTAC)
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO'
      CHECK (status IN ('ATIVO','SUSPENSO','REVOGADO')),
    s141_status VARCHAR(50), -- ATIVO, SUSPENSO, REVOGADO (perante a ANAC)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.training_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    document_type VARCHAR(50) NOT NULL, -- MIP, MGQ, MGSO, PRE, MANUAL_ALUNO, MANUAL_INSTRUTOR
    title VARCHAR(255) NOT NULL,
    current_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'MINUTA',
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Alunos e matrículas (S141)
```sql
CREATE TABLE ops.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    enrollment_code VARCHAR(100) UNIQUE NOT NULL, -- código de matrícula S141
    course_type VARCHAR(50) NOT NULL, -- PP, PC, PLA, IFR, COMISSARIO, MMA, DOV
    status VARCHAR(50) NOT NULL DEFAULT 'MATRICULADO'
      CHECK (status IN ('MATRICULADO','APROVADO','REPROVADO','CANCELADO','TRANSFERIDO','DESISTENTE')),
    enrollment_date DATE NOT NULL,
    course_duration_months INT NOT NULL,
    max_duration_months INT NOT NULL, -- dobro do período letivo homologado
    theory_evaluation_date DATE,
    theory_valid_until DATE, -- 12 meses
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.student_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES ops.students(id),
    record_type VARCHAR(50) NOT NULL, -- FREQUENCIA, NOTA, FICHA_VOO, AVALIACAO
    subject VARCHAR(255),
    score NUMERIC(5,2),
    flight_hours NUMERIC(10,2),
    instructor_id UUID REFERENCES identity.users(id),
    date DATE NOT NULL,
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 FSTD (simuladores) e instrutores
```sql
CREATE TABLE ops.fstd_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    device_type VARCHAR(50) NOT NULL, -- FFS, FTD, FNPT, BITD
    qualification_level VARCHAR(20) NOT NULL, -- LEVEL_A, LEVEL_B, LEVEL_C, LEVEL_D, BITD, FNPT_I, FNPT_II, FTD_4, FTD_5, FTD_6
    qualification_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'QUALIFICADO'
      CHECK (status IN ('QUALIFICADO','QUALIFICACAO_VENCIDA','EM_MANUTENCAO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    instructor_type VARCHAR(50) NOT NULL, -- SOLO, VOO, SIMULADOR, EXAMINADOR
    pedagogical_hours INT NOT NULL DEFAULT 8, -- 8 horas pedagógicas (IS 142-003)
    recertification_date DATE,
    recertification_valid_until DATE, -- 24 meses
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. ENTIDADES DO ERP 153 (AERÓDROMOS)

### 4.1 Aeródromo e infraestrutura
```sql
CREATE TABLE ops.aerodromes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    icao_code VARCHAR(4) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    fire_category VARCHAR(10), -- CAT_1 a CAT_10
    fire_category_validity TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops.runway_pavement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    runway_designator VARCHAR(10) NOT NULL,
    pcn VARCHAR(50),
    iri_m_km NUMERIC(5,2), -- ≤ 2,5 m/km
    macrotexture_mm NUMERIC(5,2), -- ≥ 0,60 mm
    friction_coefficient NUMERIC(5,3),
    last_inspection DATE,
    next_inspection DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 Condição de pista (RWYCC/RCR)
```sql
CREATE TABLE ops.runway_condition_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    runway_designator VARCHAR(10) NOT NULL,
    report_time TIMESTAMPTZ NOT NULL,
    rwycc_t1 INT NOT NULL CHECK (rwycc_t1 BETWEEN 0 AND 6),
    rwycc_t2 INT NOT NULL CHECK (rwycc_t2 BETWEEN 0 AND 6),
    rwycc_t3 INT NOT NULL CHECK (rwycc_t3 BETWEEN 0 AND 6),
    contaminants JSONB NOT NULL DEFAULT '[]', -- água, lâmina d'água, borracha, gelo
    rcr_message TEXT NOT NULL, -- mensagem padronizada RCR
    sent_to_twr BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_twr_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 SESCINC (contraincêndio)
```sql
CREATE TABLE ops.fire_response_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    incident_type VARCHAR(50) NOT NULL,
    alarm_time TIMESTAMPTZ NOT NULL,
    agent_application_time TIMESTAMPTZ NOT NULL,
    response_time_seconds INT NOT NULL, -- máx. 180s (3 min)
    within_limit BOOLEAN NOT NULL,
    fire_vehicles JSONB NOT NULL DEFAULT '[]',
    extinguishing_agents JSONB NOT NULL DEFAULT '[]', -- LGE, PQ_ABC, PQ_BC
    observer_present BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 Fauna (SIGRA)
```sql
CREATE TABLE ops.fauna_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    event_type VARCHAR(50) NOT NULL, -- AVISTAMENTO, COLISAO
    species VARCHAR(100),
    location VARCHAR(255),
    date TIMESTAMPTZ NOT NULL,
    risk_grade NUMERIC(10,4), -- R = log(x)
    sent_to_sigra BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_sigra_at TIMESTAMPTZ,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. REGRAS DE NEGÓCIO OBRIGATÓRIAS

### 5.1 Instrução (141/142)
1. Aluno que atinge o dobro do período letivo homologado → matrícula cancelada automaticamente (S141).
2. Avaliação teórica de ground school válida por 12 meses; expirada invalida o aproveitamento.
3. Certificado de conclusão emitido em até 10 dias corridos após o término.
4. Recertificação de examinadores a cada 24 meses; vencido bloqueia bancas.
5. Fichas de instrução e avaliações guardadas por 5 anos.
6. Vistorias semestrais da ANAC: 2x/ano (máx. 180 dias entre).
7. Comunicação de vacância de cargos de direção em até 60 dias.
8. Instrutor de CTAC exige 8 horas de treinamento pedagógico inicial.
9. Treinamento de examinadores credenciados do CTAC NÃO admite redução de carga horária.
10. FSTD com qualificação vencida bloqueia sessões de treinamento.
11. Sincronização bidirecional com S141 (6 situações do aluno, status do CIAC, instrutores, histórico).
12. Cursos práticos de MMA realizados obrigatoriamente em oficinas homologadas.

### 5.2 Aeródromos (153)
1. Tempo-resposta SESCINC: máximo de 3 minutos (180s) do acionamento até a aplicação do agente no ponto mais distante.
2. IRI longitudinal ≤ 2,5 m/km; macrotextura ≥ 0,60 mm.
3. RWYCC 0 a 6 calculado por terço (T1/T2/T3) via matriz RCAM; mensagem RCR transmitida à TWR.
4. Relatório quadrimestral do SGSO nos dias 20/01, 20/05 e 20/09.
5. Checklists de inspeção retidos por 6 meses; ações corretivas de engenharia em 12 meses.
6. Registro de avistamentos/colisões com fauna enviado ao SIGRA; risco R = log(x).
7. Rebaixamento de CAT contraincêndio notificado imediatamente.
8. Credenciamento de pessoas e veículos no lado ar (IS 153.107-001).
9. Manutenção aeroportuária nas 8 áreas (pista, taxiway, pátio, sinalização, iluminação, elétrica, equipamentos, veículos).
10. Toda ação (RCR, resposta de incêndio, evento de fauna) gera bloco no ledger.

## 6. ENDPOINTS DA API

### 6.1 Instrução (141/142)
- `POST /api/v1/training-centers`
- `GET /api/v1/training-centers`
- `POST /api/v1/training-documents`
- `GET /api/v1/training-documents`
- `POST /api/v1/students`
- `GET /api/v1/students`
- `POST /api/v1/students/:id/transfer` (transferência externa S141)
- `POST /api/v1/students/:id/graduate` (conclusão + certificado)
- `POST /api/v1/student-records`
- `GET /api/v1/student-records`
- `POST /api/v1/fstd-devices`
- `GET /api/v1/fstd-devices`
- `POST /api/v1/instructors`
- `GET /api/v1/instructors`
- `GET /api/v1/training/dashboard` (KPIs)

### 6.2 Aeródromos (153)
- `POST /api/v1/aerodromes`
- `GET /api/v1/aerodromes`
- `POST /api/v1/runway-pavement`
- `GET /api/v1/runway-pavement`
- `POST /api/v1/runway-condition-reports`
- `GET /api/v1/runway-condition-reports`
- `POST /api/v1/fire-response-logs`
- `GET /api/v1/fire-response-logs`
- `POST /api/v1/fauna-events`
- `GET /api/v1/fauna-events`
- `GET /api/v1/aerodromes/dashboard` (KPIs)

## 7. TESTES OBRIGATÓRIOS DA PARTE 7

1. Teste de trava de matrícula: aluno no dobro do período letivo é cancelado.
2. Teste de ground school: avaliação teórica expirada (12 meses) invalida aproveitamento.
3. Teste de certificado: emitido em até 10 dias corridos.
4. Teste de examinador: recertificação vencida (24 meses) bloqueia bancas.
5. Teste de FSTD: qualificação vencida bloqueia sessões.
6. Teste de S141: sincronização bidirecional das 6 situações do aluno.
7. Teste de SESCINC: tempo-resposta > 3 minutos registra desvio e alerta.
8. Teste de RWYCC: cálculo por terço (T1/T2/T3) e emissão de RCR.
9. Teste de fauna: risco R = log(x) calculado e envio ao SIGRA.
10. Teste de relatório quadrimestral: datas 20/01, 20/05, 20/09.
11. Teste de ancoragem: RCR, resposta de incêndio e evento de fauna geram blocos no ledger.
12. Teste de performance: cálculo de RWYCC em < 50ms.

## 8. CRITÉRIOS DE ACEITE DA PARTE 7

- [ ] ERP 141 (CIAC) com integração S141, 6 situações do aluno, dobro do período letivo.
- [ ] ERP 142 (CTAC) com 5 documentos, FSTD RBAC 60, 8 horas pedagógicas.
- [ ] Certificado em 10 dias; ground school 12 meses; examinadores 24 meses.
- [ ] ERP 153 com SOCMS, manutenção em 8 áreas, PISOA.
- [ ] RWYCC/RCR por terço com envio à TWR.
- [ ] SESCINC com tempo-resposta de 3 minutos.
- [ ] Fauna com risco R = log(x) e integração SIGRA.
- [ ] SGSO de aeródromo com relatório quadrimestral.
- [ ] Todas as regras de negócio implementadas e testadas.
- [ ] Testes de aceite passando; lacunas listadas.