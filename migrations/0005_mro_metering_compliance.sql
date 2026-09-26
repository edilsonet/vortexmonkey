-- ============================================================
-- VORTEX v4 — ERP Manutenção: medição de medidores e conformidade
-- Base regulatória: RBAC 43/145, IS 43.13-004; Resolução ANAC 458/2017
-- (registro eletrônico imutável).
--
-- Esta migração cria o mínimo de domínio que o motor de aeronavegabilidade
-- precisa persistir. `ops.aircraft` aqui é o SUBCONJUNTO CANÔNICO para medição
-- e conformidade; o restante do schema `ops` (ordens de serviço, ferramentaria,
-- estoque técnico, DAs, END, OM) chega com a fase do ERP Manutenção e deve
-- ESTENDER esta tabela via ALTER TABLE, nunca recriá-la.
--
-- Diferenças deliberadas em relação à árvore v1: toda tabela carrega
-- `company_id` e `created_by` e ancora `ledger_block_id` (regras 1 e 3 do
-- contrato), e o RLS exige tenant E empresa (não apenas tenant).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ops;

-- ─────────────────────────────────────────────
-- Aeronave (subconjunto canônico)
-- ─────────────────────────────────────────────
CREATE TABLE ops.aircraft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  registration varchar(10) NOT NULL UNIQUE,
  model varchar(100) NOT NULL,
  manufacturer varchar(100) NOT NULL,
  serial_number varchar(100),
  total_hours numeric(15,2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
  total_cycles integer NOT NULL DEFAULT 0 CHECK (total_cycles >= 0),
  airworthiness_status varchar(50) NOT NULL DEFAULT 'AERONAVEGAVEL'
    CHECK (airworthiness_status IN ('AERONAVEGAVEL','INOPERANTE','GROUNDED')),
  certificate_number varchar(100),
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ops_aircraft_tenant ON ops.aircraft(tenant_id, company_id);

-- ─────────────────────────────────────────────
-- Leituras de medidor (append-only)
-- ─────────────────────────────────────────────
CREATE TABLE ops.aircraft_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  reading_date date NOT NULL,
  tach numeric(10,2) CHECK (tach IS NULL OR tach >= 0),
  hobbs numeric(10,2) CHECK (hobbs IS NULL OR hobbs >= 0),
  airframe numeric(10,2) CHECK (airframe IS NULL OR airframe >= 0),
  -- Leitura estimada (ADSB, razão hobbs<->tach) é registro, mas NUNCA entra na
  -- taxa de utilização: seria circular. O motor consulta esta coluna.
  estimated boolean NOT NULL DEFAULT false,
  source varchar(50),
  notes text,
  recorded_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (tach IS NOT NULL OR hobbs IS NOT NULL OR airframe IS NOT NULL)
);
CREATE INDEX idx_meter_readings_aircraft_date ON ops.aircraft_meter_readings(aircraft_id, reading_date DESC);
CREATE INDEX idx_meter_readings_tenant ON ops.aircraft_meter_readings(tenant_id, company_id);

-- Registro eletrônico imutável (Resolução 458/2017): correção é nova leitura,
-- nunca UPDATE. O medidor é monotônico, então o histórico é a fonte da verdade.
CREATE FUNCTION ops.prevent_meter_reading_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO 458/2017: leituras de medidor são imutáveis; registre uma nova leitura.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meter_readings_no_update BEFORE UPDATE ON ops.aircraft_meter_readings
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_meter_reading_mutation();
CREATE TRIGGER trg_meter_readings_no_delete BEFORE DELETE ON ops.aircraft_meter_readings
  FOR EACH ROW EXECUTE FUNCTION ops.prevent_meter_reading_mutation();

-- ─────────────────────────────────────────────
-- Itens de conformidade (inspeções, DAs, revisões, componentes)
-- ─────────────────────────────────────────────
CREATE TABLE ops.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  kind varchar(60) NOT NULL,
  label varchar(255) NOT NULL,
  regulatory boolean NOT NULL DEFAULT true,
  interval_months integer CHECK (interval_months IS NULL OR interval_months > 0),
  interval_hours numeric(10,2) CHECK (interval_hours IS NULL OR interval_hours > 0),
  interval_cycles integer CHECK (interval_cycles IS NULL OR interval_cycles > 0),
  month_counting varchar(10) NOT NULL DEFAULT 'calendar'
    CHECK (month_counting IN ('exact','calendar','days30')),
  meter varchar(10) CHECK (meter IS NULL OR meter IN ('tach','hobbs','airframe')),
  last_done_date date,
  last_done_hours numeric(10,2),
  last_done_cycles integer,
  next_due_date date,
  next_due_hours numeric(10,2),
  next_due_cycles integer,
  status varchar(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','ARQUIVADO')),
  notes text,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (interval_months IS NOT NULL OR interval_hours IS NOT NULL OR interval_cycles IS NOT NULL)
);
CREATE INDEX idx_compliance_items_aircraft ON ops.compliance_items(aircraft_id, status);
CREATE INDEX idx_compliance_items_tenant ON ops.compliance_items(tenant_id, company_id);
CREATE INDEX idx_compliance_items_due ON ops.compliance_items(next_due_date) WHERE status = 'ATIVO';

-- ─────────────────────────────────────────────
-- Regras de reset cruzado (ex.: revisão geral reseta inspeção periódica)
-- ─────────────────────────────────────────────
CREATE TABLE ops.compliance_reset_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  adjusted_kind varchar(60) NOT NULL,
  adjusted_by_kind varchar(60) NOT NULL,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, adjusted_kind, adjusted_by_kind),
  CHECK (adjusted_kind <> adjusted_by_kind)
);
CREATE INDEX idx_compliance_reset_rules_tenant ON ops.compliance_reset_rules(tenant_id, company_id);

-- ─────────────────────────────────────────────
-- Row-Level Security: tenant é contexto; exige vínculo de tenant E empresa
-- ─────────────────────────────────────────────
ALTER TABLE ops.aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.aircraft_meter_readings FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.compliance_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.compliance_reset_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.compliance_reset_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY aircraft_select ON ops.aircraft FOR SELECT
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY aircraft_insert ON ops.aircraft FOR INSERT
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()) AND created_by = identity.current_user_id());
CREATE POLICY aircraft_update ON ops.aircraft FOR UPDATE
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()))
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));

CREATE POLICY meter_readings_select ON ops.aircraft_meter_readings FOR SELECT
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY meter_readings_insert ON ops.aircraft_meter_readings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()) AND recorded_by = identity.current_user_id());

CREATE POLICY compliance_items_select ON ops.compliance_items FOR SELECT
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY compliance_items_insert ON ops.compliance_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()) AND created_by = identity.current_user_id());
CREATE POLICY compliance_items_update ON ops.compliance_items FOR UPDATE
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()))
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));

CREATE POLICY compliance_reset_rules_select ON ops.compliance_reset_rules FOR SELECT
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY compliance_reset_rules_insert ON ops.compliance_reset_rules FOR INSERT
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()) AND created_by = identity.current_user_id());

-- ─────────────────────────────────────────────
-- GRANTS (menor privilégio: leitura de medidor é append-only)
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON ops.aircraft TO vortex_app;
GRANT SELECT, INSERT ON ops.aircraft_meter_readings TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ops.compliance_items TO vortex_app;
GRANT SELECT, INSERT ON ops.compliance_reset_rules TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO vortex_app;

-- ─────────────────────────────────────────────
-- Ancoragem no ledger (validação diferida dentro da mesma transação)
-- ─────────────────────────────────────────────
CREATE CONSTRAINT TRIGGER aircraft_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ops.aircraft
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER meter_readings_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ops.aircraft_meter_readings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER compliance_items_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ops.compliance_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER compliance_reset_rules_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ops.compliance_reset_rules
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
