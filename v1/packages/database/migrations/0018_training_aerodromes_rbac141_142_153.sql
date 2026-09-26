-- ============================================================
-- VORTEX — Fase 7: ERP 141/142 (Instrução e Treinamento) + ERP 153 (Aeródromos)
-- RBAC 141 (CIAC), RBAC 142 (CTAC), RBAC 60 (FSTD), RBAC 153
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ops;

-- ─────────────────────────────────────────────
-- 3.1 CIAC / CTAC e documentos (RBAC 141 / 142)
-- ─────────────────────────────────────────────
CREATE TABLE ops.training_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    center_type VARCHAR(50) NOT NULL CHECK (center_type IN ('CIAC','CTAC')),
    ciac_type VARCHAR(50) CHECK (ciac_type IN ('TIPO_1_PILOTOS','TIPO_2_COMISSARIOS','TIPO_3_MECANICOS')),
    certificate_number VARCHAR(100),
    certificate_validity TIMESTAMPTZ,
    ei_number VARCHAR(100), -- Especificações de Instrução (CIAC)
    et_number VARCHAR(100), -- Especificações de Treinamento (CTAC)
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','REVOGADO')),
    s141_status VARCHAR(50) CHECK (s141_status IN ('ATIVO','SUSPENSO','REVOGADO')), -- perante a ANAC
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_centers_tenant ON ops.training_centers(tenant_id, center_type);

CREATE TABLE ops.training_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('MIP','MGQ','MGSO','PRE','MANUAL_ALUNO','MANUAL_INSTRUTOR')),
    title VARCHAR(255) NOT NULL,
    current_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'MINUTA'
      CHECK (approval_status IN ('MINUTA','SUBMETIDO','APROVADO','ACEITO','REJEITADO','REVOGADO')),
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_documents_center ON ops.training_documents(center_id, document_type);

-- ─────────────────────────────────────────────
-- 3.2 Alunos e matrículas (S141 — IS 141-001)
-- ─────────────────────────────────────────────
CREATE TABLE ops.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    enrollment_code VARCHAR(100) UNIQUE NOT NULL, -- código de matrícula S141
    course_type VARCHAR(50) NOT NULL CHECK (course_type IN ('PP','PC','PLA','IFR','COMISSARIO','MMA','DOV')),
    status VARCHAR(50) NOT NULL DEFAULT 'MATRICULADO'
      CHECK (status IN ('MATRICULADO','APROVADO','REPROVADO','CANCELADO','TRANSFERIDO','DESISTENTE')),
    enrollment_date DATE NOT NULL,
    course_duration_months INT NOT NULL CHECK (course_duration_months > 0),
    max_duration_months INT NOT NULL, -- dobro do período letivo homologado
    theory_evaluation_date DATE,
    theory_valid_until DATE, -- 12 meses
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_tenant ON ops.students(tenant_id, status);
CREATE INDEX idx_students_center ON ops.students(center_id);

CREATE TABLE ops.student_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES ops.students(id),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('FREQUENCIA','NOTA','FICHA_VOO','AVALIACAO')),
    subject VARCHAR(255),
    score NUMERIC(5,2),
    flight_hours NUMERIC(10,2),
    instructor_id UUID REFERENCES identity.users(id),
    fstd_device_id UUID, -- referência opcional de sessão em FSTD (RBAC 60)
    date DATE NOT NULL,
    content_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_records_student ON ops.student_records(student_id, record_type);

-- ─────────────────────────────────────────────
-- 3.3 FSTD (RBAC 60) e instrutores
-- ─────────────────────────────────────────────
CREATE TABLE ops.fstd_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('FFS','FTD','FNPT','BITD')),
    qualification_level VARCHAR(20) NOT NULL CHECK (qualification_level IN ('LEVEL_A','LEVEL_B','LEVEL_C','LEVEL_D','BITD','FNPT_I','FNPT_II','FTD_4','FTD_5','FTD_6')),
    qualification_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'QUALIFICADO'
      CHECK (status IN ('QUALIFICADO','QUALIFICACAO_VENCIDA','EM_MANUTENCAO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fstd_tenant ON ops.fstd_devices(tenant_id, status);

CREATE TABLE ops.instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    center_id UUID NOT NULL REFERENCES ops.training_centers(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    instructor_type VARCHAR(50) NOT NULL CHECK (instructor_type IN ('SOLO','VOO','SIMULADOR','EXAMINADOR')),
    pedagogical_hours INT NOT NULL DEFAULT 8, -- 8 horas pedagógicas (IS 142-003)
    recertification_date DATE,
    recertification_valid_until DATE, -- 24 meses
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO'
      CHECK (status IN ('ATIVO','RECERTIFICACAO_VENCIDA','INATIVO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_instructors_tenant ON ops.instructors(tenant_id, instructor_type, status);

-- ─────────────────────────────────────────────
-- 4.1 Aeródromo e infraestrutura (RBAC 153)
-- ─────────────────────────────────────────────
CREATE TABLE ops.aerodromes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    icao_code VARCHAR(4) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    fire_category VARCHAR(10) CHECK (fire_category IN ('CAT_1','CAT_2','CAT_3','CAT_4','CAT_5','CAT_6','CAT_7','CAT_8','CAT_9','CAT_10')),
    fire_category_validity TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL' CHECK (status IN ('OPERACIONAL','INOPERANTE','EM_OBRAS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aerodromes_tenant ON ops.aerodromes(tenant_id);

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_runway_pavement_aerodrome ON ops.runway_pavement(aerodrome_id);

-- ─────────────────────────────────────────────
-- 4.2 Condição de pista (RWYCC/RCR — IS 153.133-001)
-- ─────────────────────────────────────────────
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
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcr_aerodrome ON ops.runway_condition_reports(aerodrome_id, report_time DESC);

-- ─────────────────────────────────────────────
-- 4.3 SESCINC (contraincêndio — IS 153.403-001 a 433-001)
-- ─────────────────────────────────────────────
CREATE TABLE ops.fire_response_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    incident_type VARCHAR(50) NOT NULL,
    alarm_time TIMESTAMPTZ NOT NULL,
    agent_application_time TIMESTAMPTZ NOT NULL,
    response_time_seconds INT NOT NULL CHECK (response_time_seconds >= 0), -- máx. 180s (3 min)
    within_limit BOOLEAN NOT NULL,
    fire_vehicles JSONB NOT NULL DEFAULT '[]',
    extinguishing_agents JSONB NOT NULL DEFAULT '[]', -- LGE, PQ_ABC, PQ_BC
    observer_present BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fire_response_aerodrome ON ops.fire_response_logs(aerodrome_id);

-- ─────────────────────────────────────────────
-- 4.4 Fauna (SIGRA — IS 153.501-001 a 505-001)
-- ─────────────────────────────────────────────
CREATE TABLE ops.fauna_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aerodrome_id UUID NOT NULL REFERENCES ops.aerodromes(id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('AVISTAMENTO','COLISAO')),
    species VARCHAR(100),
    location VARCHAR(255),
    date TIMESTAMPTZ NOT NULL,
    risk_grade NUMERIC(10,4), -- R = log(x)
    sent_to_sigra BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_sigra_at TIMESTAMPTZ,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fauna_aerodrome ON ops.fauna_events(aerodrome_id, date DESC);

-- ─────────────────────────────────────────────
-- Imutabilidade: RCR, resposta de incêndio e eventos de fauna são
-- registros operacionais ancorados no ledger — UPDATE/DELETE bloqueados.
-- ─────────────────────────────────────────────
CREATE FUNCTION ops.prevent_aerodrome_record_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO RBAC 153: registros de RCR, resposta de incêndio e eventos de fauna são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rcr_no_update BEFORE UPDATE ON ops.runway_condition_reports
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();
CREATE TRIGGER trg_rcr_no_delete BEFORE DELETE ON ops.runway_condition_reports
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();
CREATE TRIGGER trg_fire_no_update BEFORE UPDATE ON ops.fire_response_logs
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();
CREATE TRIGGER trg_fire_no_delete BEFORE DELETE ON ops.fire_response_logs
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();
CREATE TRIGGER trg_fauna_no_update BEFORE UPDATE ON ops.fauna_events
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();
CREATE TRIGGER trg_fauna_no_delete BEFORE DELETE ON ops.fauna_events
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_aerodrome_record_mutation();

-- ─────────────────────────────────────────────
-- RLS — ops (instrução e aeródromos)
-- ─────────────────────────────────────────────
ALTER TABLE ops.training_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.training_centers FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.training_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.training_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.students FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.student_records FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.fstd_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.fstd_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.instructors FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.aerodromes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aerodromes FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.runway_pavement ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.runway_pavement FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.runway_condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.runway_condition_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.fire_response_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.fire_response_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.fauna_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.fauna_events FORCE ROW LEVEL SECURITY;

CREATE POLICY training_centers_select ON ops.training_centers FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY training_documents_select ON ops.training_documents FOR SELECT USING (center_id IN (SELECT id FROM ops.training_centers));
CREATE POLICY students_select ON ops.students FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY student_records_select ON ops.student_records FOR SELECT USING (student_id IN (SELECT id FROM ops.students));
CREATE POLICY fstd_select ON ops.fstd_devices FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY instructors_select ON ops.instructors FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY aerodromes_select ON ops.aerodromes FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY runway_pavement_select ON ops.runway_pavement FOR SELECT USING (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY rcr_select ON ops.runway_condition_reports FOR SELECT USING (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fire_response_select ON ops.fire_response_logs FOR SELECT USING (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fauna_select ON ops.fauna_events FOR SELECT USING (aerodrome_id IN (SELECT id FROM ops.aerodromes));

-- ─────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON ops.training_centers TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.training_documents TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.students TO vortex_app;
GRANT SELECT, INSERT ON ops.student_records TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.fstd_devices TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.instructors TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.aerodromes TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.runway_pavement TO vortex_app;
GRANT SELECT, INSERT ON ops.runway_condition_reports TO vortex_app;
GRANT SELECT, INSERT ON ops.fire_response_logs TO vortex_app;
GRANT SELECT, INSERT ON ops.fauna_events TO vortex_app;
-- Validação diferida de referências ao ledger (particionado, sem FK real — padrão 0008)
CREATE CONSTRAINT TRIGGER trg_student_records_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.student_records
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_rcr_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.runway_condition_reports
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_fire_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.fire_response_logs
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_fauna_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.fauna_events
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO vortex_app;