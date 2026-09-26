-- ==================================================================
-- 0021 — RLOJA + BRE + INTEGRATIONS (Phase 8)
-- Creates: catalog.listings, catalog.orders, bre.rules,
--          integrations.rab_validations, integrations.integration_logs
-- RLS on all tables; deferred ledger triggers; grants to vortex_app
-- ==================================================================

-- ── schemas ──────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS bre;
CREATE SCHEMA IF NOT EXISTS integrations;

-- ══════════════════════════════════════════════════════════════════
-- 1. CATALOG (RLoja)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE catalog.listings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES identity.tenants(id),
    inventory_item_id UUID NOT NULL,                     -- FK enforced by BRE rule, not DB (view of inventory)
    origin            VARCHAR(50) NOT NULL CHECK (origin IN ('EMPRESA','PARTICULAR')),
    seller_company_id UUID,
    seller_person_id  UUID,
    category          VARCHAR(50) NOT NULL CHECK (category IN (
                        'AERONAVE','MOTOR','HELICE','RADIO','INSTRUMENTO','ACESSORIO','PECA','CONSUMIVEL')),
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    price             NUMERIC(15,2) NOT NULL CHECK (price > 0),
    currency          VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status            VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO'
                      CHECK (status IN ('RASCUNHO','PUBLICADO','PAUSADO','VENDIDO','CANCELADO')),
    published_by      UUID,
    published_at      TIMESTAMPTZ,
    admin_approved    BOOLEAN NOT NULL DEFAULT FALSE,
    ledger_block_id   UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  catalog.listings IS 'RLoja — anúncio é VISÃO do estoque (não registro separado)';
COMMENT ON COLUMN catalog.listings.origin IS 'EMPRESA = estoque empresarial; PARTICULAR = estoque particular da pessoa';

CREATE TABLE catalog.orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES identity.tenants(id),
    listing_id        UUID NOT NULL REFERENCES catalog.listings(id),
    buyer_company_id  UUID,
    buyer_person_id   UUID,
    amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 3.00,
    commission_amount NUMERIC(15,2) NOT NULL,
    status            VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
                      CHECK (status IN ('PENDENTE','PAGO','CONCLUIDO','CANCELADO')),
    payment_reference VARCHAR(100),
    ledger_block_id   UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE catalog.orders IS 'Pedidos da RLoja — 3% comissão cobrada do vendedor; comprador isento';

-- ══════════════════════════════════════════════════════════════════
-- 2. BRE (Motor de Regras Declarativo)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE bre.rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    severity    VARCHAR(20) NOT NULL CHECK (severity IN ('BLOCKING','CRITICAL','WARNING','INFO')),
    description TEXT NOT NULL,
    module      VARCHAR(50) NOT NULL,
    params      JSONB NOT NULL DEFAULT '{}',
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','DISABLED','TEST')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bre.rules IS 'BRE — seed de regras de negócio; nenhuma regra hardcoded';

INSERT INTO bre.rules (code, severity, description, module, params, status) VALUES
  ('ACCREDITATION_EXPIRED',       'BLOCKING', 'Credenciamento expirado (>3 anos) → bloqueio automático; alerta 60 dias antes.', 'identity',    '{"validYears":3,"alertDays":60}', 'ACTIVE'),
  ('LICENSE_EXPIRED',             'BLOCKING', 'Licença/CMA/credenciamento vencido → bloqueio do profissional.',           'identity',    '{}', 'ACTIVE'),
  ('TOXICOLOGICAL_EXPIRED',       'BLOCKING', 'Exame toxicológico vencido (>90 dias) → bloqueio da função ARSO.',          'compliance',  '{"validDays":90}', 'ACTIVE'),
  ('MEL_ITEM_EXPIRED',            'BLOCKING', 'Item MEL vencido → bloqueio do voo (IS 91-012).',                          'operators',   '{}', 'ACTIVE'),
  ('DA_PENDING',                  'BLOCKING', 'DA aplicável pendente → prevalece sobre a MEL.',                            'operators',   '{}', 'ACTIVE'),
  ('FUEL_INSUFFICIENT',           'BLOCKING', 'Combustível abaixo do mínimo regulamentar → despacho bloqueado.',           'operators',   '{"vfrMinutes":30,"ifrMinutes":45}', 'ACTIVE'),
  ('TOOL_CALIBRATION_EXPIRED',    'BLOCKING', 'Ferramenta com calibração vencida → bloqueio de uso na OS.',               'maintenance', '{}', 'ACTIVE'),
  ('PART_RED_TAG',                'BLOCKING', 'Peça com etiqueta vermelha → bloqueio de instalação.',                      'maintenance', '{}', 'ACTIVE'),
  ('CRS_WITHOUT_SIGNATURE',       'BLOCKING', 'OS não aprovada para retorno sem assinatura de profissional habilitado.',  'maintenance', '{}', 'ACTIVE'),
  ('SEGVOO_REQUIRED',             'BLOCKING', 'Grande reparo/alteração → SEGVOO 001 antes do retorno.',                    'maintenance', '{}', 'ACTIVE'),
  ('AIRCRAFT_RAB_MISMATCH',       'BLOCKING', 'Matrícula de aeronave deve bater com o RAB (fonte ANAC).',                 'operators',   '{}', 'ACTIVE'),
  ('LISTING_WITHOUT_INVENTORY',   'BLOCKING', 'Anúncio da RLoja é visão do estoque — sem item, sem anúncio.',             'rloja',       '{}', 'ACTIVE'),
  ('ENROLLMENT_DOUBLE_PERIOD',    'BLOCKING', 'Matrícula no dobro do período letivo → cancelamento (S141).',              'training',    '{"maxPeriods":2}', 'ACTIVE'),
  ('SESCINC_RESPONSE_OVER_LIMIT', 'CRITICAL', 'Tempo-resposta SESCINC > 3 minutos → alerta crítico.',                     'training',    '{"maxSeconds":180}', 'ACTIVE');

-- ══════════════════════════════════════════════════════════════════
-- 3. INTEGRATIONS (RAB, Asaas, Resend logs)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE integrations.rab_validations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES identity.tenants(id),
    matricula     VARCHAR(20) NOT NULL,
    status        VARCHAR(30) NOT NULL CHECK (status IN (
                    'VALID','INVALID_REGISTRATION','NAME_MISMATCH','REGISTRATION_INACTIVE')),
    owner_on_record TEXT NOT NULL,
    source        VARCHAR(20) NOT NULL CHECK (source IN ('SCRAPING','MANUAL','CACHED')),
    validated_by  UUID,
    cached_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE integrations.rab_validations IS 'Resultado de validação RAB (scraping ANAC, sem API oficial)';

CREATE TABLE integrations.integration_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,                                  -- NULL for global integrations
    provider      VARCHAR(50) NOT NULL,                  -- ASAAS, RESEND, SENTRY, RAB, GITGUARDIAN
    direction     VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
    event_type    VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL DEFAULT '{}',
    response      JSONB,
    status        VARCHAR(20) NOT NULL DEFAULT 'OK' CHECK (status IN ('OK','ERROR','TIMEOUT','CIRCUIT_OPEN')),
    idempotency_key VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE integrations.integration_logs IS 'Ledger de todas as chamadas externas — imutável (append-only)';

-- Idempotency on integration logs (webhook idempotente não duplica)
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_logs_idempotency
    ON integrations.integration_logs (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════
-- 4. RLS
-- ══════════════════════════════════════════════════════════════════

-- catalog.listings
ALTER TABLE catalog.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY listings_tenant_isolation ON catalog.listings
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY listings_insert ON catalog.listings
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY listings_update ON catalog.listings
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- catalog.orders
ALTER TABLE catalog.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_isolation ON catalog.orders
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY orders_insert ON catalog.orders
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY orders_update ON catalog.orders
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- integrations.rab_validations (tenant-scoped)
ALTER TABLE integrations.rab_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY rab_validations_tenant_isolation ON integrations.rab_validations
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY rab_validations_insert ON integrations.rab_validations
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- integrations.integration_logs (tenant-scoped when tenant_id set)
ALTER TABLE integrations.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_logs_tenant_isolation ON integrations.integration_logs
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY integration_logs_insert ON integrations.integration_logs
    FOR INSERT WITH CHECK (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant')::uuid);

-- bre.rules — global, no RLS needed (shared across tenants)
-- (RLS intentionally NOT enabled — rules are global seed data)

-- ══════════════════════════════════════════════════════════════════
-- 5. IMMUTABILITY TRIGGERS (listings, orders — append-only pattern)
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION catalog.prevent_listing_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow status transitions (business flow) but block data mutations
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'VIOLAÇÃO DE IMUTABILIDADE: catalog.listings é append-only. Dados não podem ser alterados após criação.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_immutable
    BEFORE UPDATE OR DELETE ON catalog.listings
    FOR EACH ROW EXECUTE FUNCTION catalog.prevent_listing_mutation();

CREATE OR REPLACE FUNCTION catalog.prevent_order_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow status transitions (PENDENTE→PAGO→CONCLUIDO) but block data mutations
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'VIOLAÇÃO DE IMUTABILIDADE: catalog.orders é append-only. Dados não podem ser alterados após criação.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_immutable
    BEFORE UPDATE OR DELETE ON catalog.orders
    FOR EACH ROW EXECUTE FUNCTION catalog.prevent_order_mutation();

-- ══════════════════════════════════════════════════════════════════
-- 6. IMMUTABILITY TRIGGER for integration_logs
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION integrations.prevent_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO DE IMUTABILIDADE: integrations.integration_logs é append-only.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_integration_log_immutable
    BEFORE UPDATE OR DELETE ON integrations.integration_logs
    FOR EACH ROW EXECUTE FUNCTION integrations.prevent_log_mutation();

-- ══════════════════════════════════════════════════════════════════
-- 7. GRANTS
-- ══════════════════════════════════════════════════════════════════

-- Schema usage
GRANT USAGE ON SCHEMA catalog TO vortex_app;
GRANT USAGE ON SCHEMA bre TO vortex_app;
GRANT USAGE ON SCHEMA integrations TO vortex_app;

-- catalog.listings
GRANT SELECT, INSERT ON catalog.listings TO vortex_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA catalog TO vortex_app;

-- catalog.orders
GRANT SELECT, INSERT, UPDATE ON catalog.orders TO vortex_app;

-- bre.rules
GRANT SELECT ON bre.rules TO vortex_app;

-- integrations.rab_validations
GRANT SELECT, INSERT ON integrations.rab_validations TO vortex_app;

-- integrations.integration_logs
GRANT SELECT, INSERT ON integrations.integration_logs TO vortex_app;
