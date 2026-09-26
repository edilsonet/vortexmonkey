-- ============================================================
-- VORTEX — Fase 4: Billing, RBAC 120 (PPSP) e Alertas Preditivos
-- Subscriptions, PPSP (substâncias psicoativas) e Hub de Alertas
-- ============================================================

-- ─────────────────────────────────────────────
-- SCHEMA: subscriptions
-- ─────────────────────────────────────────────

CREATE TABLE subscriptions.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ERP','RH','CRM','LOJA','OPERADORES','MANUTENCAO','INSTRUCAO')),
    owner_company_id UUID NOT NULL REFERENCES identity.companies(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_company ON subscriptions.tenants(owner_company_id);

CREATE TABLE subscriptions.tenant_users (
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','USER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX idx_tenant_users_user ON subscriptions.tenant_users(user_id);

CREATE TABLE subscriptions.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('STARTER','PRO','ENTERPRISE')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','OVERDUE','BLOCKED','CANCELLED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    renews_at TIMESTAMPTZ,
    overdue_since TIMESTAMPTZ,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions.subscriptions(tenant_id);

CREATE TABLE subscriptions.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    period_year_month VARCHAR(7) NOT NULL, -- '2026-09'
    event_count INT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    active_users INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period_year_month)
);

CREATE TABLE subscriptions.asaas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    external_id VARCHAR(255) NOT NULL UNIQUE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED')),
    billing_type VARCHAR(50) NOT NULL CHECK (billing_type IN ('PIX','BOLETO','CREDIT_CARD')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_tenant ON subscriptions.asaas_invoices(tenant_id, created_at DESC);

-- RLS — subscriptions
ALTER TABLE subscriptions.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.usage_metrics FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.asaas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.asaas_invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON subscriptions.tenants FOR SELECT
    USING (id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tenant_users_select ON subscriptions.tenant_users FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY subscriptions_select ON subscriptions.subscriptions FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY usage_select ON subscriptions.usage_metrics FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY invoices_select ON subscriptions.asaas_invoices FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ─────────────────────────────────────────────
-- SCHEMA: identity (PPSP — RBAC 120)
-- ─────────────────────────────────────────────

CREATE TABLE identity.arso_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    arso_function VARCHAR(100) NOT NULL CHECK (arso_function IN (
      'PILOTO_COMANDO','COPILOTO','COMISSARIO_VOO','MECANICO_VOO',
      'MECANICO_MANUTENCAO_AERONAUTICA','DESPACHANTE_OPERACIONAL_VOO',
      'OPERADOR_TRATOR_RAMPA_AEROPORTO','AGENTE_PROTECAO_AVSEC'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','SUSPENDED','INACTIVE')),
    suspension_reason VARCHAR(500),
    suspended_at TIMESTAMPTZ,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_arso_tenant ON identity.arso_personnel(tenant_id, status);
CREATE INDEX idx_arso_user ON identity.arso_personnel(user_id);

CREATE TABLE identity.toxicological_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    arso_personnel_id UUID NOT NULL REFERENCES identity.arso_personnel(id),
    exam_date DATE NOT NULL,
    validity_end DATE NOT NULL, -- 90 dias após a coleta
    result VARCHAR(50) NOT NULL CHECK (result IN ('NEGATIVO','POSITIVO','INCONCLUSIVO')),
    laboratory VARCHAR(255) NOT NULL,
    report_hash VARCHAR(64) NOT NULL,
    is_random_sample BOOLEAN NOT NULL DEFAULT false,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tox_arso ON identity.toxicological_exams(arso_personnel_id, validity_end DESC);
CREATE INDEX idx_tox_tenant ON identity.toxicological_exams(tenant_id, validity_end);

-- Imutabilidade de exames toxicológicos (Regra RBAC 120.17)
CREATE FUNCTION identity.prevent_toxicological_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO RBAC 120: exames toxicológicos são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tox_no_update BEFORE UPDATE ON identity.toxicological_exams
    FOR EACH ROW EXECUTE FUNCTION identity.prevent_toxicological_mutation();
CREATE TRIGGER trg_tox_no_delete BEFORE DELETE ON identity.toxicological_exams
    FOR EACH ROW EXECUTE FUNCTION identity.prevent_toxicological_mutation();

-- RLS — identity PPSP
ALTER TABLE identity.arso_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.arso_personnel FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.toxicological_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.toxicological_exams FORCE ROW LEVEL SECURITY;

CREATE POLICY arso_select ON identity.arso_personnel FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY arso_insert ON identity.arso_personnel FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY arso_update ON identity.arso_personnel FOR UPDATE
    USING (tenant_id IN (SELECT identity.current_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

CREATE POLICY tox_select ON identity.toxicological_exams FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tox_insert ON identity.toxicological_exams FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ─────────────────────────────────────────────
-- SCHEMA: notifications (Hub de Alertas Preditivos)
-- ─────────────────────────────────────────────

CREATE TABLE notifications.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','LIDO','RESOLVIDO','EXPIRADO')),
    notification_key VARCHAR(255) UNIQUE,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_alerts_tenant ON notifications.alerts(tenant_id, status, severity);
CREATE INDEX idx_alerts_due ON notifications.alerts(due_date) WHERE status = 'ABERTO';

-- RLS — notifications
ALTER TABLE notifications.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY alerts_select ON notifications.alerts FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY alerts_insert ON notifications.alerts FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY alerts_update ON notifications.alerts FOR UPDATE
    USING (tenant_id IN (SELECT identity.current_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ─────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON subscriptions.tenants TO vortex_app;
GRANT SELECT, INSERT, DELETE ON subscriptions.tenant_users TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON subscriptions.subscriptions TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON subscriptions.usage_metrics TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON subscriptions.asaas_invoices TO vortex_app;

GRANT SELECT, INSERT, UPDATE ON identity.arso_personnel TO vortex_app;
GRANT SELECT, INSERT ON identity.toxicological_exams TO vortex_app;

GRANT SELECT, INSERT, UPDATE ON notifications.alerts TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA subscriptions, notifications TO vortex_app;
