CREATE TABLE IF NOT EXISTS mro.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  com_number varchar(100) NOT NULL,
  eo_number varchar(100),
  status varchar(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENSO','CANCELADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, com_number)
);

CREATE TABLE IF NOT EXISTS mro.aircraft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  registration varchar(10) NOT NULL,
  model varchar(100) NOT NULL,
  manufacturer varchar(100) NOT NULL,
  total_hours numeric(15,2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  total_cycles int NOT NULL DEFAULT 0 CHECK (total_cycles >= 0),
  airworthiness_status varchar(20) NOT NULL DEFAULT 'AERONAVEGAVEL'
    CHECK (airworthiness_status IN ('AERONAVEGAVEL','INOPERANTE','GROUNDED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, registration)
);

CREATE TABLE IF NOT EXISTS mro.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  number varchar(50) NOT NULL,
  aircraft_id uuid NOT NULL REFERENCES mro.aircraft(id),
  step int NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 12),
  status varchar(30) NOT NULL DEFAULT 'ABERTA'
    CHECK (status IN ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECAS','AGUARDANDO_APROVACAO','CONCLUIDA','CANCELADA')),
  work_type varchar(30) NOT NULL
    CHECK (work_type IN ('PREVENTIVA','CORRETIVA','GRANDE_REPARO','GRANDE_ALTERACAO','INSPECAO','REVISAO')),
  is_major boolean NOT NULL DEFAULT false,
  requires_segvoo boolean NOT NULL DEFAULT false,
  technical_data_ref varchar(100),
  crs_issued boolean NOT NULL DEFAULT false,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, number)
);

CREATE TABLE IF NOT EXISTS mro.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  part_number varchar(100) NOT NULL,
  serial_number varchar(100),
  condition varchar(40) NOT NULL
    CHECK (condition IN ('NOVA','USADA_SERVICAVEL','USADA_NAO_SERVICAVEL','REVISADA','REPARADA')),
  tag varchar(50) NOT NULL DEFAULT 'VERDE_SERVICAVEL'
    CHECK (tag IN ('VERDE_SERVICAVEL','AMARELA_REPARAVEL_INSPECAO','VERMELHA_CONDENADA_NAO_AERONAVEGAVEL')),
  certification_type varchar(20) NOT NULL
    CHECK (certification_type IN ('TC','STC','TSO','PMA','OTP','PADRAO')),
  form_8130_3 varchar(100),
  status varchar(20) NOT NULL DEFAULT 'EM_ESTOQUE'
    CHECK (status IN ('EM_ESTOQUE','QUARENTENA','RESERVADO','INSTALADO','DESCARTADO')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mro.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  identification varchar(100) NOT NULL,
  description varchar(255),
  calibration_standard varchar(50)
    CHECK (calibration_standard IS NULL OR calibration_standard IN ('RBC_INMETRO','FABRICANTE_OEM','PADRAO_RASTREAVEL_INTERNACIONAL')),
  calibration_expiry date,
  status varchar(30) NOT NULL DEFAULT 'OPERACIONAL'
    CHECK (status IN ('OPERACIONAL','CALIBRACAO_VENCIDA','EM_MANUTENCAO','BAIXADA')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, identification)
);

CREATE TABLE IF NOT EXISTS mro.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  aircraft_id uuid NOT NULL REFERENCES mro.aircraft(id),
  ad_number varchar(100) NOT NULL,
  description text,
  status varchar(20) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','CUMPRIDA','NAO_APLICAVEL','REVOGADA')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mro.manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  title varchar(255) NOT NULL,
  kind varchar(20) NOT NULL CHECK (kind IN ('AMM','SRM','CMM','IPC','SB')),
  revision varchar(40),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mro.ndt_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  work_order_id uuid REFERENCES mro.work_orders(id),
  method varchar(40) NOT NULL,
  result varchar(20) NOT NULL CHECK (result IN ('APROVADO','REPROVADO','INCONCLUSIVO')),
  report_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION mro.prevent_ndt_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'NDT/CRS imutavel. UPDATE/DELETE bloqueados.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ndt_no_update ON mro.ndt_reports;
CREATE TRIGGER trg_ndt_no_update BEFORE UPDATE ON mro.ndt_reports
  FOR EACH ROW EXECUTE FUNCTION mro.prevent_ndt_mutation();
DROP TRIGGER IF EXISTS trg_ndt_no_delete ON mro.ndt_reports;
CREATE TRIGGER trg_ndt_no_delete BEFORE DELETE ON mro.ndt_reports
  FOR EACH ROW EXECUTE FUNCTION mro.prevent_ndt_mutation();

ALTER TABLE mro.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.aircraft FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.work_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.parts FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.tools FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.ads FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.manuals FORCE ROW LEVEL SECURITY;
ALTER TABLE mro.ndt_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mro.ndt_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mro_org_tenant ON mro.organizations;
CREATE POLICY mro_org_tenant ON mro.organizations USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_ac_tenant ON mro.aircraft;
CREATE POLICY mro_ac_tenant ON mro.aircraft USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_wo_tenant ON mro.work_orders;
CREATE POLICY mro_wo_tenant ON mro.work_orders USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_parts_tenant ON mro.parts;
CREATE POLICY mro_parts_tenant ON mro.parts USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_tools_tenant ON mro.tools;
CREATE POLICY mro_tools_tenant ON mro.tools USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_ads_tenant ON mro.ads;
CREATE POLICY mro_ads_tenant ON mro.ads USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_manuals_tenant ON mro.manuals;
CREATE POLICY mro_manuals_tenant ON mro.manuals USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS mro_ndt_tenant ON mro.ndt_reports;
CREATE POLICY mro_ndt_tenant ON mro.ndt_reports USING (tenant_id = identity.current_tenant_id());

GRANT USAGE ON SCHEMA mro TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mro TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mro TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA mro TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA mro GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
