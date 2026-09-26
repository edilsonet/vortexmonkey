CREATE TABLE IF NOT EXISTS ops.air_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  operator_type varchar(20) NOT NULL CHECK (operator_type IN ('RBAC_91','RBAC_121','RBAC_135','RBAC_137')),
  coa_number varchar(100),
  coa_validity timestamptz,
  classification varchar(20) CHECK (classification IS NULL OR classification IN ('SIMPLES','PADRAO')),
  eo_number varchar(100),
  certification_phase varchar(20) NOT NULL DEFAULT 'FASE_1'
    CHECK (certification_phase IN ('FASE_1','FASE_2','FASE_3','FASE_4','FASE_5','CERTIFICADO')),
  etops_approved boolean NOT NULL DEFAULT false,
  etops_diversion_minutes int CHECK (etops_diversion_minutes IS NULL OR etops_diversion_minutes > 0),
  status varchar(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','CANCELADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.aircraft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  registration varchar(10) NOT NULL,
  model varchar(100) NOT NULL,
  aircraft_category varchar(20) NOT NULL DEFAULT 'AVIAO'
    CHECK (aircraft_category IN ('AVIAO','HELICOPTERO','JATO','TURBOELICE')),
  max_passengers int CHECK (max_passengers IS NULL OR max_passengers >= 0),
  last_reweigh_date date,
  next_reweigh_date date,
  cva_number varchar(100),
  cva_issued_at timestamptz,
  cva_status varchar(20) NOT NULL DEFAULT 'NAO_EMITIDO'
    CHECK (cva_status IN ('NAO_EMITIDO','VALIDO','VENCIDO','BLOQUEADO')),
  status varchar(20) NOT NULL DEFAULT 'OPERACIONAL'
    CHECK (status IN ('OPERACIONAL','INOPERANTE','BAIXADA')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, registration)
);

CREATE TABLE IF NOT EXISTS ops.operator_fleet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  operator_id uuid NOT NULL REFERENCES ops.air_operators(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  status varchar(20) NOT NULL DEFAULT 'OPERACIONAL'
    CHECK (status IN ('OPERACIONAL','INOPERANTE','BAIXADA')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, aircraft_id)
);

CREATE TABLE IF NOT EXISTS ops.mel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  ata_chapter varchar(10) NOT NULL,
  item_description varchar(255) NOT NULL,
  category varchar(10) NOT NULL CHECK (category IN ('CAT_A','CAT_B','CAT_C','CAT_D')),
  deferral_deadline timestamptz,
  procedure_o text,
  procedure_m text,
  status varchar(20) NOT NULL DEFAULT 'OPERACIONAL'
    CHECK (status IN ('OPERACIONAL','DIFERIDO','EXPIRADO','REPARADO')),
  da_applicable boolean NOT NULL DEFAULT false,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.da_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  da_number varchar(100) NOT NULL,
  description text,
  status varchar(20) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','CUMPRIDA','CANCELADA')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.logbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  entry_type varchar(20) NOT NULL DEFAULT 'flight' CHECK (entry_type IN ('flight','ground_run')),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  departure_aerodrome varchar(10) NOT NULL,
  arrival_aerodrome varchar(10) NOT NULL,
  flight_time_hours numeric(15,2) NOT NULL CHECK (flight_time_hours >= 0),
  pilot_name varchar(255) NOT NULL,
  pilot_license varchar(50) NOT NULL,
  pilot_funcao varchar(10) NOT NULL DEFAULT 'PIC' CHECK (pilot_funcao IN ('PIC','SIC','INSP','INSTR')),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','rectified','voided')),
  content_hash varchar(64),
  signed_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.dispatch_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  flight_number varchar(20),
  departure varchar(10) NOT NULL,
  destination varchar(10) NOT NULL,
  flight_rule varchar(10) NOT NULL CHECK (flight_rule IN ('VFR','IFR')),
  is_night boolean NOT NULL DEFAULT false,
  has_alternate boolean NOT NULL DEFAULT false,
  fuel_required_minutes int NOT NULL CHECK (fuel_required_minutes >= 0),
  fuel_planned_minutes int NOT NULL CHECK (fuel_planned_minutes >= 0),
  fuel_valid boolean NOT NULL DEFAULT false,
  weight_balance_valid boolean NOT NULL DEFAULT false,
  met_valid boolean NOT NULL DEFAULT false,
  validation_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'RASCUNHO'
    CHECK (status IN ('RASCUNHO','VALIDADO','LIBERADO','BLOQUEADO','EXECUTADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.operational_manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  operator_id uuid NOT NULL REFERENCES ops.air_operators(id),
  manual_type varchar(20) NOT NULL CHECK (manual_type IN ('MGO','AOM','MCMSV','MGM','PTO','SOP','MIP')),
  title varchar(255) NOT NULL,
  current_version varchar(20) NOT NULL DEFAULT '1.0',
  approval_status varchar(20) NOT NULL DEFAULT 'MINUTA'
    CHECK (approval_status IN ('MINUTA','SUBMETIDO','APROVADO','ACEITO','REJEITADO','REVOGADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.agri_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  cdag_number varchar(100),
  cdag_validity timestamptz,
  status varchar(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','CASSADO','DESISTENTE')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.dispersers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  disperser_type varchar(20) NOT NULL CHECK (disperser_type IN ('SOLIDOS','LIQUIDOS','GRANULARES')),
  calibration_expiry date,
  dgps_installed boolean NOT NULL DEFAULT false,
  dgps_conformity_declaration varchar(100),
  status varchar(30) NOT NULL DEFAULT 'OPERACIONAL'
    CHECK (status IN ('OPERACIONAL','CALIBRACAO_VENCIDA','INOPERANTE')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ops.prevent_logbook_immutable_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Logbook imutavel. DELETE bloqueado.' USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Logbook anulado e terminal.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_logbook_no_delete ON ops.logbook_entries;
CREATE TRIGGER trg_logbook_no_delete BEFORE DELETE ON ops.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_logbook_immutable_mutation();
DROP TRIGGER IF EXISTS trg_logbook_no_voided_update ON ops.logbook_entries;
CREATE TRIGGER trg_logbook_no_voided_update BEFORE UPDATE ON ops.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_logbook_immutable_mutation();

CREATE OR REPLACE FUNCTION ops.prevent_released_dispatch_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('LIBERADO','EXECUTADO') THEN
    RAISE EXCEPTION 'Despacho liberado imutavel. UPDATE/DELETE bloqueados.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch_no_update ON ops.dispatch_releases;
CREATE TRIGGER trg_dispatch_no_update BEFORE UPDATE ON ops.dispatch_releases
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_released_dispatch_mutation();
DROP TRIGGER IF EXISTS trg_dispatch_no_delete ON ops.dispatch_releases;
CREATE TRIGGER trg_dispatch_no_delete BEFORE DELETE ON ops.dispatch_releases
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_released_dispatch_mutation();

ALTER TABLE ops.air_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.air_operators FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.operator_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.operator_fleet FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.mel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.mel_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.da_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.da_items FORCE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS ops_air_operators_tenant ON ops.air_operators;
CREATE POLICY ops_air_operators_tenant ON ops.air_operators USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_aircraft_tenant ON ops.aircraft;
CREATE POLICY ops_aircraft_tenant ON ops.aircraft USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_fleet_tenant ON ops.operator_fleet;
CREATE POLICY ops_fleet_tenant ON ops.operator_fleet USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_mel_tenant ON ops.mel_items;
CREATE POLICY ops_mel_tenant ON ops.mel_items USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_da_tenant ON ops.da_items;
CREATE POLICY ops_da_tenant ON ops.da_items USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_logbook_tenant ON ops.logbook_entries;
CREATE POLICY ops_logbook_tenant ON ops.logbook_entries USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_dispatch_tenant ON ops.dispatch_releases;
CREATE POLICY ops_dispatch_tenant ON ops.dispatch_releases USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_manuals_tenant ON ops.operational_manuals;
CREATE POLICY ops_manuals_tenant ON ops.operational_manuals USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_agri_tenant ON ops.agri_operators;
CREATE POLICY ops_agri_tenant ON ops.agri_operators USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ops_dispersers_tenant ON ops.dispersers;
CREATE POLICY ops_dispersers_tenant ON ops.dispersers USING (tenant_id = identity.current_tenant_id());

GRANT USAGE ON SCHEMA ops TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ops TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
