CREATE TABLE IF NOT EXISTS subscriptions.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  kind varchar(20) NOT NULL CHECK (kind IN ('RCONTA','APP','ERP')),
  price_brl numeric(12,2) NOT NULL CHECK (price_brl >= 0),
  billed varchar(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billed IN ('MONTHLY','YEARLY')),
  sellable boolean NOT NULL DEFAULT true
);

INSERT INTO subscriptions.products(id, code, name, kind, price_brl, billed, sellable)
SELECT * FROM (VALUES
  ('aaaa1111-1111-4111-8111-111111111111'::uuid, 'RCONTA_VIP', 'Rconta VIP', 'RCONTA', 49.90, 'MONTHLY', true),
  ('aaaa2222-2222-4222-8222-222222222222'::uuid, 'RECRUITMENT', 'Recrutamento', 'APP', 199.00, 'MONTHLY', true),
  ('aaaa3333-3333-4333-8333-333333333333'::uuid, 'ERP_MRO', 'ERP Manutencao', 'ERP', 899.00, 'MONTHLY', true),
  ('aaaa4444-4444-4444-8444-444444444444'::uuid, 'ERP_OPS', 'ERP Operadores', 'ERP', 899.00, 'MONTHLY', true),
  ('aaaa5555-5555-4555-8555-555555555555'::uuid, 'ERP_TRAINING', 'ERP Cursos e Treinamentos', 'ERP', 699.00, 'MONTHLY', true),
  ('aaaa6666-6666-4666-8666-666666666666'::uuid, 'ERP_AIRPORT', 'ERP Aerodromos', 'ERP', 799.00, 'MONTHLY', true)
) AS v(id, code, name, kind, price_brl, billed, sellable)
WHERE NOT EXISTS (SELECT 1 FROM subscriptions.products p WHERE p.code = v.code);

CREATE TABLE IF NOT EXISTS subscriptions.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  product_id uuid NOT NULL REFERENCES subscriptions.products(id),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAST_DUE','SUSPENDED','CANCELED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_open
  ON subscriptions.subscriptions (person_id, product_id)
  WHERE status IN ('ACTIVE','PAST_DUE','SUSPENDED');

CREATE TABLE IF NOT EXISTS subscriptions.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  subscription_id uuid NOT NULL REFERENCES subscriptions.subscriptions(id),
  amount_brl numeric(12,2) NOT NULL CHECK (amount_brl >= 0),
  status varchar(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('OPEN','PAID','VOID')),
  paid_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  source varchar(30) NOT NULL CHECK (source IN ('RLOJA_SALE','RECRUITMENT_HIRE')),
  source_id uuid NOT NULL,
  seller_person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  gross_brl numeric(12,2) NOT NULL CHECK (gross_brl >= 0),
  rate numeric(6,4) NOT NULL DEFAULT 0.0300,
  amount_brl numeric(12,2) NOT NULL CHECK (amount_brl >= 0),
  buyer_exempt boolean NOT NULL DEFAULT true,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance.ppsp_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  year int NOT NULL CHECK (year >= 2020),
  arso_person_id uuid NOT NULL REFERENCES identity.people(id),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, year)
);

CREATE TABLE IF NOT EXISTS compliance.ppsp_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES compliance.ppsp_programs(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  safety_sensitive boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, person_id)
);

CREATE TABLE IF NOT EXISTS compliance.ppsp_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  collected_at date NOT NULL,
  valid_until date NOT NULL,
  result varchar(20) NOT NULL CHECK (result IN ('NEGATIVE','POSITIVE','PENDING')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance.ppsp_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES compliance.ppsp_programs(id),
  year int NOT NULL,
  pool_size int NOT NULL,
  sample_size int NOT NULL,
  coverage numeric(6,4) NOT NULL,
  seed varchar(64) NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance.ppsp_draw_members (
  draw_id uuid NOT NULL REFERENCES compliance.ppsp_draws(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  PRIMARY KEY (draw_id, person_id)
);

CREATE TABLE IF NOT EXISTS notifications.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES identity.tenants(id),
  person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  severity varchar(20) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
  source varchar(40) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  entity_type varchar(40),
  entity_id uuid,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACK','RESOLVED')),
  fingerprint varchar(80) NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, fingerprint)
);

ALTER TABLE subscriptions.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions.commissions FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_programs FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_members FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_exams FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_draws FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_draw_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.ppsp_draw_members FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY products_read ON subscriptions.products FOR SELECT USING (true);

CREATE POLICY subscriptions_self ON subscriptions.subscriptions
  USING (person_id = identity.current_person_id() OR tenant_id = identity.current_tenant_id());

CREATE POLICY invoices_via_sub ON subscriptions.invoices
  USING (subscription_id IN (SELECT id FROM subscriptions.subscriptions));

CREATE POLICY commissions_tenant ON subscriptions.commissions
  USING (tenant_id = identity.current_tenant_id() OR seller_person_id = identity.current_person_id());

CREATE POLICY ppsp_programs_tenant ON compliance.ppsp_programs
  USING (tenant_id = identity.current_tenant_id() OR arso_person_id = identity.current_person_id());

CREATE POLICY ppsp_members_via_program ON compliance.ppsp_members
  USING (program_id IN (SELECT id FROM compliance.ppsp_programs) OR person_id = identity.current_person_id());

CREATE POLICY ppsp_exams_tenant ON compliance.ppsp_exams
  USING (tenant_id = identity.current_tenant_id() OR person_id = identity.current_person_id());

CREATE POLICY ppsp_draws_via_program ON compliance.ppsp_draws
  USING (program_id IN (SELECT id FROM compliance.ppsp_programs));

CREATE POLICY ppsp_draw_members_via_draw ON compliance.ppsp_draw_members
  USING (draw_id IN (SELECT id FROM compliance.ppsp_draws) OR person_id = identity.current_person_id());

CREATE POLICY alerts_self ON notifications.alerts
  USING (person_id = identity.current_person_id() OR tenant_id = identity.current_tenant_id());

GRANT USAGE ON SCHEMA subscriptions, notifications TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA subscriptions TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notifications TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA compliance TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA subscriptions TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA notifications TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA compliance TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA subscriptions TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA notifications TO vortex_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA subscriptions GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA compliance GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
