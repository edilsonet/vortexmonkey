-- ============================================================
-- VORTEX — Fase 5: ERP 43+145 — Manutenção Aeronáutica e OM
-- RBAC 43, RBAC 145, RBAC 39, IS 43.13-004, IS 43.13-005, IS 43-001
-- ============================================================

-- Garantia do schema compartilhado do domínio operacional
CREATE SCHEMA IF NOT EXISTS ops;

-- ─────────────────────────────────────────────
-- SCHEMA: ops (Manutenção Aeronáutica)
-- ─────────────────────────────────────────────

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
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','CANCELADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_om_tenant ON ops.maintenance_organizations(tenant_id);

CREATE TABLE ops.maintenance_organization_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES ops.maintenance_organizations(id),
    person_id UUID NOT NULL REFERENCES identity.users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('RT','GR','GERENTE_QUALIDADE','INSPETOR','TECNICO')),
    accreditation_number VARCHAR(100),
    accreditation_expiry TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENDED','INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_om_personnel_org ON ops.maintenance_organization_personnel(organization_id);

CREATE TABLE ops.aircraft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    registration VARCHAR(10) UNIQUE NOT NULL, -- PP-XXX / PR-XXX / PT-XXX / PS-XXX
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    total_hours NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
    total_cycles INT NOT NULL DEFAULT 0 CHECK (total_cycles >= 0),
    airworthiness_status VARCHAR(50) NOT NULL DEFAULT 'AERONAVEGAVEL' CHECK (airworthiness_status IN ('AERONAVEGAVEL','INOPERANTE','GROUNDED')),
    certificate_number VARCHAR(100), -- CA/COA
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aircraft_tenant ON ops.aircraft(tenant_id);

CREATE TABLE ops.aircraft_logbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    logbook_type VARCHAR(50) NOT NULL CHECK (logbook_type IN ('CELULA','MOTOR','HELICE','COMPONENTE')),
    component_identification VARCHAR(100),
    entries JSONB NOT NULL DEFAULT '[]', -- horas, ciclos, intervenções, DAs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logbooks_aircraft ON ops.aircraft_logbooks(aircraft_id, logbook_type);

CREATE TABLE ops.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    aircraft_id UUID NOT NULL REFERENCES ops.aircraft(id),
    step INT NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 12), -- 12 etapas do fluxo comercial/técnico
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTA'
      CHECK (status IN ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECAS','AGUARDANDO_APROVACAO','CONCLUIDA','CANCELADA')),
    work_type VARCHAR(50) NOT NULL CHECK (work_type IN ('PREVENTIVA','CORRETIVA','GRANDE_REPARO','GRANDE_ALTERACAO','INSPECAO','REVISAO')),
    is_major BOOLEAN NOT NULL DEFAULT false,
    requires_segvoo BOOLEAN NOT NULL DEFAULT false,
    technical_data_ref VARCHAR(100), -- AMM, SRM, CMM
    assigned_technician_id UUID REFERENCES identity.users(id),
    assigned_inspector_id UUID REFERENCES identity.users(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    crs_issued BOOLEAN NOT NULL DEFAULT false,
    crs_signature_id UUID REFERENCES signatures.signatures(id),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_orders_tenant ON ops.work_orders(tenant_id, status);
CREATE INDEX idx_work_orders_aircraft ON ops.work_orders(aircraft_id);

CREATE TABLE ops.work_order_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES ops.work_orders(id),
    task_number VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ata_chapter VARCHAR(10),
    manual_ref VARCHAR(100), -- AMM/SRM/CMM
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDA','CANCELADA')),
    performed_by UUID REFERENCES identity.users(id),
    performed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_tasks_wo ON ops.work_order_tasks(work_order_id);

CREATE TABLE ops.parts_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    part_number VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('NOVA','USADA_SERVICAVEL','USADA_NAO_SERVICAVEL','REVISADA','REPARADA')),
    tag VARCHAR(50) NOT NULL DEFAULT 'VERDE_SERVICAVEL'
      CHECK (tag IN ('VERDE_SERVICAVEL','AMARELA_REPARAVEL_INSPECAO','VERMELHA_CONDENADA_NAO_AERONAVEGAVEL')),
    certification_type VARCHAR(50) NOT NULL CHECK (certification_type IN ('TC','STC','TSO','PMA','OTP','PADRAO')),
    form_8130_3 VARCHAR(100), -- Certificado de liberação de autorização
    is_life_limited BOOLEAN NOT NULL DEFAULT false,
    life_limit_hours NUMERIC(10,2),
    life_limit_cycles INT,
    shelf_life_months INT,
    shelf_life_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'EM_ESTOQUE'
      CHECK (status IN ('EM_ESTOQUE','QUARENTENA','RESERVADO','INSTALADO','DESCARTADO')),
    quarantine_reason TEXT,
    traceability JSONB NOT NULL DEFAULT '[]',
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parts_tenant ON ops.parts_inventory(tenant_id, status, tag);
CREATE INDEX idx_parts_pn ON ops.parts_inventory(part_number);

CREATE TABLE ops.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    identification VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    calibration_required BOOLEAN NOT NULL DEFAULT false,
    calibration_standard VARCHAR(50) CHECK (calibration_standard IN ('RBC_INMETRO','FABRICANTE_OEM','PADRAO_RASTREAVEL_INTERNACIONAL')),
    calibration_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL'
      CHECK (status IN ('OPERACIONAL','CALIBRACAO_VENCIDA','EM_MANUTENCAO','BAIXADA')),
    tool_box_id UUID,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tools_tenant ON ops.tools(tenant_id, status);

CREATE TABLE ops.non_destructive_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    work_order_id UUID REFERENCES ops.work_orders(id),
    method VARCHAR(50) NOT NULL CHECK (method IN ('LIQUIDO_PENETRANTE','PARTICULAS_MAGNETICAS','ULTRASSOM','RADIOGRAFIA','EDDY_CURRENT','VISUAL')),
    inspector_id UUID NOT NULL REFERENCES identity.users(id),
    inspector_level VARCHAR(20) NOT NULL CHECK (inspector_level IN ('NIVEL_I','NIVEL_II','NIVEL_III')),
    equipment_used VARCHAR(100),
    result VARCHAR(50) NOT NULL CHECK (result IN ('APROVADO','REPROVADO','INCONCLUSIVO')),
    report_hash VARCHAR(64) NOT NULL,
    signature_id UUID REFERENCES signatures.signatures(id),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ndt_wo ON ops.non_destructive_tests(work_order_id);

CREATE TABLE ops.airworthiness_directives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    aircraft_id UUID REFERENCES ops.aircraft(id),
    ad_number VARCHAR(100) NOT NULL,
    applicability VARCHAR(255),
    description TEXT,
    compliance_deadline DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','CUMPRIDA','NAO_APLICAVEL','REVOGADA')),
    amoc_approved BOOLEAN NOT NULL DEFAULT false,
    fcda_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_aircraft ON ops.airworthiness_directives(aircraft_id, status);

-- Imutabilidade de CRS, FCDA e ensaios END
CREATE FUNCTION ops.prevent_maintenance_critical_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO RBAC 43/145: registros de inspeção, CRS e END são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ndt_no_update BEFORE UPDATE ON ops.non_destructive_tests
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_maintenance_critical_mutation();
CREATE TRIGGER trg_ndt_no_delete BEFORE DELETE ON ops.non_destructive_tests
    FOR EACH ROW EXECUTE FUNCTION ops.prevent_maintenance_critical_mutation();

-- RLS — ops (manutenção)
ALTER TABLE ops.maintenance_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.maintenance_organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.maintenance_organization_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.maintenance_organization_personnel FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft_logbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft_logbooks FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.work_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.work_order_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.work_order_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.parts_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.parts_inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.tools FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.non_destructive_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.non_destructive_tests FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.airworthiness_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.airworthiness_directives FORCE ROW LEVEL SECURITY;

CREATE POLICY mo_select ON ops.maintenance_organizations FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY mop_select ON ops.maintenance_organization_personnel FOR SELECT USING (organization_id IN (SELECT id FROM ops.maintenance_organizations));
CREATE POLICY aircraft_select ON ops.aircraft FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY logbooks_select ON ops.aircraft_logbooks FOR SELECT USING (aircraft_id IN (SELECT id FROM ops.aircraft));
CREATE POLICY wo_select ON ops.work_orders FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY wo_tasks_select ON ops.work_order_tasks FOR SELECT USING (work_order_id IN (SELECT id FROM ops.work_orders));
CREATE POLICY parts_select ON ops.parts_inventory FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tools_select ON ops.tools FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ndt_select ON ops.non_destructive_tests FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ad_select ON ops.airworthiness_directives FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ─────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON ops.maintenance_organizations TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.maintenance_organization_personnel TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.aircraft TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.aircraft_logbooks TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.work_orders TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.work_order_tasks TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.parts_inventory TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.tools TO vortex_app;
GRANT SELECT, INSERT ON ops.non_destructive_tests TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.airworthiness_directives TO vortex_app;
-- Validação diferida de referências ao ledger (particionado, sem FK real — padrão 0008)
CREATE CONSTRAINT TRIGGER trg_wo_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.work_orders
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_parts_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.parts_inventory
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_tools_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.tools
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_ndt_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.non_destructive_tests
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER trg_ad_ledger_ref AFTER INSERT OR UPDATE OF ledger_block_id ON ops.airworthiness_directives
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

GRANT USAGE ON SCHEMA ops TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO vortex_app;
