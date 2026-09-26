-- ============================================================
-- VORTEX v4 — ERP Manutenção: resets declarados de medidor
-- Base regulatória: RBAC 43/145; Resolução ANAC 458/2017 (registro imutável).
--
-- Um reset declarado diz que, a partir de `reset_date`, o medidor passou a
-- valer em NOVA escala (troca/substituição do instrumento). Sem esse registro a
-- taxa de utilização costura escalas antiga e nova e infla ou zera o resultado
-- — o motor já sabe descartar o intervalo que cruza o reset, mas precisa saber
-- que ele existiu.
--
-- A tabela carrega `company_id` e `created_by` e ancora `ledger_block_id`
-- (regras 1 e 3); o RLS exige tenant E empresa, como o restante do schema `ops`.
-- ============================================================

CREATE TABLE ops.meter_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  aircraft_id uuid NOT NULL REFERENCES ops.aircraft(id),
  -- Somente medidores usados na taxa de utilização: a célula (airframe) não
  -- tem relação fixa com tach/hobbs e não entra na projeção.
  meter varchar(10) NOT NULL CHECK (meter IN ('tach','hobbs')),
  -- Primeiro dia na NOVA escala.
  reset_date date NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aircraft_id, meter, reset_date)
);
CREATE INDEX idx_meter_resets_aircraft ON ops.meter_resets(aircraft_id, meter, reset_date);
CREATE INDEX idx_meter_resets_tenant ON ops.meter_resets(tenant_id, company_id);

-- ─────────────────────────────────────────────
-- Row-Level Security: tenant E empresa
-- ─────────────────────────────────────────────
ALTER TABLE ops.meter_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.meter_resets FORCE ROW LEVEL SECURITY;

CREATE POLICY meter_resets_select ON ops.meter_resets FOR SELECT
  USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY meter_resets_insert ON ops.meter_resets FOR INSERT
  WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()) AND created_by = identity.current_user_id());

GRANT SELECT, INSERT ON ops.meter_resets TO vortex_app;

-- ─────────────────────────────────────────────
-- Ancoragem no ledger (validação diferida dentro da mesma transação)
-- ─────────────────────────────────────────────
CREATE CONSTRAINT TRIGGER meter_resets_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ops.meter_resets
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
