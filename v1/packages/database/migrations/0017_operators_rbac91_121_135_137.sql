-- ============================================================
-- VORTEX — Fase 6: ERP de Operadores Aéreos e Aeroagrícola
-- RBAC 91, RBAC 119, RBAC 121, RBAC 135, RBAC 137
-- MEL, Logbook Digital, Despacho, Manuais, Aeroagrícola (CDAG/DGPS)
-- ============================================================

-- Garantia do schema compartilhado do domínio operacional
CREATE SCHEMA IF NOT EXISTS ops;

-- ─────────────────────────────────────────────
-- 3.1 Operador e certificação (RBAC 119, 5 fases)
-- ─────────────────────────────────────────────
CREATE TABLE ops.air_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    operator_type VARCHAR(50) NOT NULL CHECK (operator_type IN ('RBAC_91','RBAC_121','RBAC_135','RBAC_137')),
    coa_number VARCHAR(100), -- Certificado de Operador Aéreo
    coa_validity TIMESTAMPTZ,
    classification VARCHAR(50) CHECK (classification IN ('SIMPLES','PADRAO')), -- RBAC 135
    eo_number VARCHAR(100), -- Especificações Operativas
    certification_phase VARCHAR(50) NOT NULL DEFAULT 'FASE_1'
      CHECK (certification_phase IN ('FASE_1','FASE_2','FASE_3','FASE_4','FASE_5','CERTIFICADO')),
    -- Extensão Fase 6: homologação ETOPS (IS 121-012) por operador
    etops_approved BOOLEAN NOT NULL DEFAULT FALSE,
    etops_diversion_minutes INT CHECK (etops_diversion_minutes IS NULL OR etops_diversion_minutes > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','CANCELADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_air_operators_tenant ON ops.air_operators(tenant_id, operator_type);
CREATE INDEX idx_air_operators_company ON ops.air_operators(company_id);

-- ─────────────────────────────────────────────
-- 3.2 Frota e aeronaves (repeso 36 meses — IS 135-21-001)
-- ─────────────────────────────────────────────
CREATE TABLE ops.operator_fleet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES ops.air_operators(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    registration VARCHAR(10) NOT NULL,
    model VARCHAR(100) NOT NULL,
    -- Extensão Fase 6: categoria necessária às regras de combustível VFR/IFR (RBAC 135)
    aircraft_category VARCHAR(20) NOT NULL DEFAULT 'AVIAO'
      CHECK (aircraft_category IN ('AVIAO','HELICOPTERO','JATO','TURBOELICE')),
    max_passengers INT CHECK (max_passengers IS NULL OR max_passengers >= 0),
    max_takeoff_weight_kg NUMERIC(10,2),
    last_reweigh_date DATE, -- repeso 36 meses
    next_reweigh_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','INOPERANTE','BAIXADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_operator_fleet_operator ON ops.operator_fleet(operator_id);
CREATE INDEX idx_operator_fleet_aircraft ON ops.operator_fleet(aircraft_id);

-- ─────────────────────────────────────────────
-- 3.3 MEL — Lista de Equipamentos Mínimos (IS 91-012)
-- ─────────────────────────────────────────────
CREATE TABLE ops.mel_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    ata_chapter VARCHAR(10) NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('CAT_A','CAT_B','CAT_C','CAT_D')),
    deferral_deadline TIMESTAMPTZ,
    procedure_o TEXT, -- Procedimento Operacional
    procedure_m TEXT, -- Procedimento de Manutenção
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','DIFERIDO','EXPIRADO','REPARADO')),
    da_applicable BOOLEAN NOT NULL DEFAULT FALSE, -- DA prevalece sobre MEL
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mel_items_tenant ON ops.mel_items(tenant_id, aircraft_id, status);

-- ─────────────────────────────────────────────
-- 3.4 Logbook digital (schema canônico vortex_logbook_entries)
-- ─────────────────────────────────────────────
CREATE TABLE ops.logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('flight','ground_run')),
    entry_date DATE NOT NULL,
    entry_time_utc TIMESTAMPTZ NOT NULL,
    departure_aerodrome VARCHAR(10) NOT NULL, -- ICAO
    arrival_aerodrome VARCHAR(10) NOT NULL, -- ICAO
    block_off_time TIMESTAMPTZ,
    takeoff_time TIMESTAMPTZ NOT NULL,
    landing_time TIMESTAMPTZ NOT NULL,
    block_on_time TIMESTAMPTZ,
    flight_time_hours DECIMAL(15,2) NOT NULL CHECK (flight_time_hours >= 0),
    habilitacao VARCHAR(10) NOT NULL, -- IFRA, MLTE, MNTE, IFRH
    modelo VARCHAR(50) NOT NULL,
    pousos INTEGER DEFAULT 1 NOT NULL CHECK (pousos >= 1),
    diurno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    noturno DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    navegacao DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    instrumento DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    capota DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    simulador DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    milhas_navegacao DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tpx BOOLEAN DEFAULT false NOT NULL,
    experimental BOOLEAN DEFAULT false NOT NULL,
    airframe_hours_increment DECIMAL(15,2) NOT NULL CHECK (airframe_hours_increment >= 0),
    airframe_cycles_increment INTEGER NOT NULL CHECK (airframe_cycles_increment >= 0),
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
    pilot_funcao VARCHAR(50) NOT NULL CHECK (pilot_funcao IN ('PIC','SIC','INSP','INSTR')),
    signature_timestamp TIMESTAMPTZ,
    signature_identity VARCHAR(255),
    signature_verified BOOLEAN DEFAULT false NOT NULL,
    signature_verification_data JSONB,
    attestation_text TEXT,
    endossado BOOLEAN DEFAULT false NOT NULL,
    endossado_por UUID REFERENCES identity.users(id),
    endossado_em TIMESTAMPTZ,
    dbe_enviado BOOLEAN DEFAULT false NOT NULL,
    dbe_enviado_em TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft','signed','rectified','voided')),
    rectification_reason TEXT,
    voided_reason TEXT,
    content_hash VARCHAR(64),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    version INTEGER DEFAULT 1 NOT NULL CHECK (version >= 1),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_logbook_entries_tenant ON ops.logbook_entries(tenant_id, status);
CREATE INDEX idx_logbook_entries_aircraft ON ops.logbook_entries(aircraft_id, entry_date);

-- ─────────────────────────────────────────────
-- 3.5 Despacho operacional (DOV)
-- ─────────────────────────────────────────────
CREATE TABLE ops.dispatch_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    flight_number VARCHAR(20),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    departure VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    alternates JSONB NOT NULL DEFAULT '[]',
    flight_rule VARCHAR(10) NOT NULL CHECK (flight_rule IN ('VFR','IFR')),
    is_night BOOLEAN NOT NULL DEFAULT FALSE,
    fuel_required_minutes INT NOT NULL CHECK (fuel_required_minutes >= 0),
    fuel_planned_minutes INT NOT NULL CHECK (fuel_planned_minutes >= 0),
    fuel_valid BOOLEAN NOT NULL DEFAULT FALSE,
    weight_balance_valid BOOLEAN NOT NULL DEFAULT FALSE,
    met_valid BOOLEAN NOT NULL DEFAULT FALSE,
    mel_items_valid BOOLEAN NOT NULL DEFAULT FALSE,
    doo_id UUID NOT NULL REFERENCES identity.users(id), -- Despachante Operacional de Voo
    doo_signature_id UUID REFERENCES signatures.signatures(id),
    -- Extensão Fase 6: tempo de desvio ETOPS planejado (IS 121-012)
    etops_diversion_minutes INT,
    -- Extensão Fase 6: resultados da validação (combustível, margem, PAADV, ETOPS)
    validation_notes JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO'
      CHECK (status IN ('RASCUNHO','VALIDADO','LIBERADO','BLOQUEADO','EXECUTADO')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispatch_tenant ON ops.dispatch_releases(tenant_id, status);
CREATE INDEX idx_dispatch_aircraft ON ops.dispatch_releases(aircraft_id);

-- ─────────────────────────────────────────────
-- 3.6 Manuais operacionais (MGO, AOM, MCmsV, MGM, PTO, SOP, MIP)
-- ─────────────────────────────────────────────
CREATE TABLE ops.operational_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    operator_id UUID NOT NULL REFERENCES ops.air_operators(id),
    manual_type VARCHAR(50) NOT NULL CHECK (manual_type IN ('MGO','AOM','MCMSV','MGM','PTO','SOP','MIP')),
    title VARCHAR(255) NOT NULL,
    current_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'MINUTA'
      CHECK (approval_status IN ('MINUTA','SUBMETIDO','APROVADO','ACEITO','REJEITADO','REVOGADO')),
    anac_process_number VARCHAR(100),
    content_hash VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_manuals_tenant ON ops.operational_manuals(tenant_id, operator_id, manual_type);

-- ─────────────────────────────────────────────
-- 3.7 Aeroagrícola (RBAC 137): CDAG, dispersores, DGPS
-- ─────────────────────────────────────────────
CREATE TABLE ops.agri_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    company_id UUID NOT NULL REFERENCES identity.companies(id),
    cdag_number VARCHAR(100), -- Certificado de Operador Aeroagrícola
    cdag_validity TIMESTAMPTZ,
    technical_manager_id UUID REFERENCES identity.users(id), -- RT
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO'
      CHECK (status IN ('ATIVO','SUSPENSO','CASSADO','DESISTENTE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agri_operators_tenant ON ops.agri_operators(tenant_id);

CREATE TABLE ops.dispersers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    disperser_type VARCHAR(50) NOT NULL CHECK (disperser_type IN ('SOLIDOS','LIQUIDOS','GRANULARES')),
    calibration_expiry DATE,
    emc_test_done BOOLEAN NOT NULL DEFAULT FALSE,
    circuit_breakers JSONB NOT NULL DEFAULT '[]',
    dgps_installed BOOLEAN NOT NULL DEFAULT FALSE,
    dgps_conformity_declaration VARCHAR(100), -- Declaração de Conformidade DGPS (IS 137-002)
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','CALIBRACAO_VENCIDA','INOPERANTE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispersers_tenant ON ops.dispersers(tenant_id, status);
CREATE INDEX idx_dispersers_aircraft ON ops.dispersers(aircraft_id);

-- ─────────────────────────────────────────────
-- Extensão Fase 6: CVA por aeronave (IS 91-403-001)
-- 365 dias de validade; alerta 30 dias antes; bloqueio se não conformidade crítica
-- ─────────────────────────────────────────────
ALTER TABLE ops.aircraft ADD COLUMN IF NOT EXISTS cva_number VARCHAR(100);
ALTER TABLE ops.aircraft ADD COLUMN IF NOT EXISTS cva_validity TIMESTAMPTZ;
ALTER TABLE ops.aircraft ADD COLUMN IF NOT EXISTS cva_status VARCHAR(20) NOT NULL DEFAULT 'NAO_EMITIDO'
    CHECK (cva_status IN ('NAO_EMITIDO','VALIDO','VENCIDO','BLOQUEADO'));

-- ─────────────────────────────────────────────
-- Imutabilidade
-- 1) Logbook assinado/retificado/anulado é imutável: bloqueia DELETE e
--    bloqueia UPDATE de registro anulado (terminal). Correções = nova versão.
-- 2) Despacho LIBERADO/EXECUTADO é documento operacional: bloqueia UPDATE/DELETE.
-- ─────────────────────────────────────────────
CREATE FUNCTION ops.prevent_logbook_immutable_mutation() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'VIOLAÇÃO RBAC 91/135: lançamento de logbook é imutável; DELETE é proibido.'
            USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'voided' THEN
        RAISE EXCEPTION 'VIOLAÇÃO RBAC 91/135: lançamento de logbook anulado (voided) é terminal e não pode ser alterado.'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_logbook_no_delete BEFORE DELETE ON ops.logbook_entries
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_logbook_immutable_mutation();
CREATE TRIGGER trg_logbook_no_voided_update BEFORE UPDATE ON ops.logbook_entries
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_logbook_immutable_mutation();

CREATE FUNCTION ops.prevent_released_dispatch_mutation() RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('LIBERADO','EXECUTADO') THEN
        RAISE EXCEPTION 'VIOLAÇÃO RBAC 121/135: despacho liberado é documento operacional imutável; UPDATE e DELETE são proibidos.'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispatch_no_update BEFORE UPDATE ON ops.dispatch_releases
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_released_dispatch_mutation();
CREATE TRIGGER trg_dispatch_no_delete BEFORE DELETE ON ops.dispatch_releases
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_released_dispatch_mutation();

-- ─────────────────────────────────────────────
-- RLS — ops (operadores)
-- ─────────────────────────────────────────────
ALTER TABLE ops.air_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.air_operators FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.operator_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.operator_fleet FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.mel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.mel_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.logbook_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.dispatch_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.dispatch_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.operational_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.operational_manuals FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.agri_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.agri_operators FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.dispersers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.dispersers FORCE ROW LEVEL SECURITY;

CREATE POLICY air_operators_select ON ops.air_operators FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY fleet_select ON ops.operator_fleet FOR SELECT USING (operator_id IN (SELECT id FROM ops.air_operators));
CREATE POLICY mel_items_select ON ops.mel_items FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY logbook_select ON ops.logbook_entries FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispatch_select ON ops.dispatch_releases FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY manuals_select ON ops.operational_manuals FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY agri_operators_select ON ops.agri_operators FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispersers_select ON ops.dispersers FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ─────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON ops.air_operators TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.operator_fleet TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.mel_items TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.logbook_entries TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.dispatch_releases TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.operational_manuals TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.agri_operators TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.dispersers TO vortex_app;
-- Validação diferida de referências ao ledger (particionado, sem FK real — padrão 0008)
CREATE CONSTRAINT TRIGGER trg_mel_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.mel_items
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_dispatch_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.dispatch_releases
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO vortex_app;