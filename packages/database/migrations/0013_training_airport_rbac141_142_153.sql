CREATE TABLE IF NOT EXISTS training.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  center_type varchar(10) NOT NULL CHECK (center_type IN ('CIAC','CTAC')),
  ciac_type varchar(30) CHECK (ciac_type IS NULL OR ciac_type IN ('TIPO_1_PILOTOS','TIPO_2_COMISSARIOS','TIPO_3_MECANICOS')),
  certificate_number varchar(100),
  ei_number varchar(100),
  et_number varchar(100),
  status varchar(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','REVOGADO')),
  s141_status varchar(20) DEFAULT 'ATIVO' CHECK (s141_status IS NULL OR s141_status IN ('ATIVO','SUSPENSO','REVOGADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  center_id uuid NOT NULL REFERENCES training.centers(id),
  course_type varchar(20) NOT NULL CHECK (course_type IN ('PP','PC','PLA','IFR','COMISSARIO','MMA','DOV')),
  title varchar(255) NOT NULL,
  duration_months int NOT NULL CHECK (duration_months > 0),
  sell_on_rloja boolean NOT NULL DEFAULT true,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  center_id uuid NOT NULL REFERENCES training.centers(id),
  course_id uuid REFERENCES training.courses(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  enrollment_code varchar(100) NOT NULL,
  course_type varchar(20) NOT NULL CHECK (course_type IN ('PP','PC','PLA','IFR','COMISSARIO','MMA','DOV')),
  status varchar(20) NOT NULL DEFAULT 'MATRICULADO'
    CHECK (status IN ('MATRICULADO','APROVADO','REPROVADO','CANCELADO','TRANSFERIDO','DESISTENTE')),
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  course_duration_months int NOT NULL CHECK (course_duration_months > 0),
  max_duration_months int NOT NULL,
  theory_evaluation_date date,
  theory_valid_until date,
  certificate_due date,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, enrollment_code)
);

CREATE TABLE IF NOT EXISTS training.fstd_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  center_id uuid NOT NULL REFERENCES training.centers(id),
  device_type varchar(10) NOT NULL CHECK (device_type IN ('FFS','FTD','FNPT','BITD')),
  qualification_level varchar(20) NOT NULL,
  qualification_expiry date,
  status varchar(30) NOT NULL DEFAULT 'QUALIFICADO'
    CHECK (status IN ('QUALIFICADO','QUALIFICACAO_VENCIDA','EM_MANUTENCAO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  center_id uuid NOT NULL REFERENCES training.centers(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  instructor_type varchar(20) NOT NULL CHECK (instructor_type IN ('SOLO','VOO','SIMULADOR','EXAMINADOR')),
  pedagogical_hours int NOT NULL DEFAULT 0,
  recertification_valid_until date,
  status varchar(30) NOT NULL DEFAULT 'ATIVO'
    CHECK (status IN ('ATIVO','RECERTIFICACAO_VENCIDA','INATIVO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.aerodromes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  icao_code varchar(4) NOT NULL,
  name varchar(255) NOT NULL,
  fire_category varchar(10) CHECK (fire_category IS NULL OR fire_category IN (
    'CAT_1','CAT_2','CAT_3','CAT_4','CAT_5','CAT_6','CAT_7','CAT_8','CAT_9','CAT_10')),
  status varchar(20) NOT NULL DEFAULT 'OPERACIONAL' CHECK (status IN ('OPERACIONAL','INOPERANTE','EM_OBRAS')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, icao_code)
);

CREATE TABLE IF NOT EXISTS airport.runway_pavement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  runway_designator varchar(10) NOT NULL,
  pcn varchar(50),
  iri_m_km numeric(5,2),
  macrotexture_mm numeric(5,2),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.runway_condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  runway_designator varchar(10) NOT NULL,
  rwycc_t1 int NOT NULL CHECK (rwycc_t1 BETWEEN 0 AND 6),
  rwycc_t2 int NOT NULL CHECK (rwycc_t2 BETWEEN 0 AND 6),
  rwycc_t3 int NOT NULL CHECK (rwycc_t3 BETWEEN 0 AND 6),
  contaminant varchar(30),
  rcr_message text NOT NULL,
  sent_to_twr boolean NOT NULL DEFAULT false,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.fire_response_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  incident_type varchar(50) NOT NULL,
  response_time_seconds int NOT NULL CHECK (response_time_seconds >= 0),
  within_limit boolean NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.fauna_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  event_type varchar(20) NOT NULL CHECK (event_type IN ('AVISTAMENTO','COLISAO')),
  species varchar(100),
  count int NOT NULL DEFAULT 1 CHECK (count >= 1),
  risk_grade numeric(10,4),
  sent_to_sigra boolean NOT NULL DEFAULT false,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.sgso_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  due_date date NOT NULL,
  submitted_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airport.maintenance_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aerodrome_id uuid NOT NULL REFERENCES airport.aerodromes(id),
  area varchar(30) NOT NULL CHECK (area IN (
    'PISTA','TAXIWAY','PATIO','SINALIZACAO','ILUMINACAO','ELETRICA','EQUIPAMENTOS','VEICULOS')),
  notes text,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION airport.prevent_immutable_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Registro aeroportuario imutavel. UPDATE/DELETE bloqueados.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) - 'ledger_block_id' = to_jsonb(OLD) - 'ledger_block_id' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Registro aeroportuario imutavel. UPDATE/DELETE bloqueados.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rcr_no_update ON airport.runway_condition_reports;
CREATE TRIGGER trg_rcr_no_update BEFORE UPDATE ON airport.runway_condition_reports
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS trg_rcr_no_delete ON airport.runway_condition_reports;
CREATE TRIGGER trg_rcr_no_delete BEFORE DELETE ON airport.runway_condition_reports
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS trg_fire_no_update ON airport.fire_response_logs;
CREATE TRIGGER trg_fire_no_update BEFORE UPDATE ON airport.fire_response_logs
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS trg_fire_no_delete ON airport.fire_response_logs;
CREATE TRIGGER trg_fire_no_delete BEFORE DELETE ON airport.fire_response_logs
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS trg_fauna_no_update ON airport.fauna_events;
CREATE TRIGGER trg_fauna_no_update BEFORE UPDATE ON airport.fauna_events
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();
DROP TRIGGER IF EXISTS trg_fauna_no_delete ON airport.fauna_events;
CREATE TRIGGER trg_fauna_no_delete BEFORE DELETE ON airport.fauna_events
  FOR EACH ROW EXECUTE FUNCTION airport.prevent_immutable_mutation();

ALTER TABLE training.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.centers FORCE ROW LEVEL SECURITY;
ALTER TABLE training.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.courses FORCE ROW LEVEL SECURITY;
ALTER TABLE training.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.students FORCE ROW LEVEL SECURITY;
ALTER TABLE training.fstd_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.fstd_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE training.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.instructors FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.aerodromes ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.aerodromes FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.runway_pavement ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.runway_pavement FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.runway_condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.runway_condition_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.fire_response_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.fire_response_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.fauna_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.fauna_events FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.sgso_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.sgso_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE airport.maintenance_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport.maintenance_areas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tr_centers_tenant ON training.centers;
CREATE POLICY tr_centers_tenant ON training.centers USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS tr_courses_tenant ON training.courses;
CREATE POLICY tr_courses_tenant ON training.courses USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS tr_students_tenant ON training.students;
CREATE POLICY tr_students_tenant ON training.students USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS tr_fstd_tenant ON training.fstd_devices;
CREATE POLICY tr_fstd_tenant ON training.fstd_devices USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS tr_instr_tenant ON training.instructors;
CREATE POLICY tr_instr_tenant ON training.instructors USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_aero_tenant ON airport.aerodromes;
CREATE POLICY ap_aero_tenant ON airport.aerodromes USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_pav_tenant ON airport.runway_pavement;
CREATE POLICY ap_pav_tenant ON airport.runway_pavement USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_rcr_tenant ON airport.runway_condition_reports;
CREATE POLICY ap_rcr_tenant ON airport.runway_condition_reports USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_fire_tenant ON airport.fire_response_logs;
CREATE POLICY ap_fire_tenant ON airport.fire_response_logs USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_fauna_tenant ON airport.fauna_events;
CREATE POLICY ap_fauna_tenant ON airport.fauna_events USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_sgso_tenant ON airport.sgso_reports;
CREATE POLICY ap_sgso_tenant ON airport.sgso_reports USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS ap_maint_tenant ON airport.maintenance_areas;
CREATE POLICY ap_maint_tenant ON airport.maintenance_areas USING (tenant_id = identity.current_tenant_id());

GRANT USAGE ON SCHEMA training TO vortex_app;
GRANT USAGE ON SCHEMA airport TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA training TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA airport TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA training TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA airport TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA training TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA airport TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA training GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA airport GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
