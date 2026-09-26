CREATE TABLE IF NOT EXISTS oauth.password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  inventory_item_id uuid NOT NULL REFERENCES stock.items(id),
  origin varchar(20) NOT NULL CHECK (origin IN ('EMPRESA','PARTICULAR')),
  seller_company_id uuid REFERENCES identity.companies(id),
  seller_person_id uuid REFERENCES identity.people(id),
  category varchar(30) NOT NULL CHECK (category IN (
    'AERONAVE','MOTOR','HELICE','RADIO','INSTRUMENTO','ACESSORIO','PECA','CONSUMIVEL')),
  title varchar(255) NOT NULL,
  description text,
  price numeric(15,2) NOT NULL CHECK (price >= 0),
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  status varchar(20) NOT NULL DEFAULT 'RASCUNHO'
    CHECK (status IN ('RASCUNHO','PUBLICADO','PAUSADO','VENDIDO','CANCELADO')),
  admin_approved boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  listing_id uuid NOT NULL REFERENCES market.listings(id),
  buyer_company_id uuid REFERENCES identity.companies(id),
  buyer_person_id uuid REFERENCES identity.people(id),
  amount numeric(15,2) NOT NULL,
  commission_percent numeric(5,2) NOT NULL DEFAULT 3.00,
  commission_amount numeric(15,2) NOT NULL,
  buyer_charge numeric(15,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','PAGO','CONCLUIDO','CANCELADO')),
  payment_reference varchar(100),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  kind varchar(20) NOT NULL DEFAULT 'COMPANY' CHECK (kind IN ('COMPANY','RECRUITMENT')),
  title varchar(255) NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  thread_id uuid NOT NULL REFERENCES communication.threads(id),
  author_id uuid NOT NULL REFERENCES identity.people(id),
  body text NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES identity.tenants(id),
  person_id uuid REFERENCES identity.people(id),
  template varchar(40) NOT NULL,
  subject varchar(255) NOT NULL,
  body text NOT NULL,
  kind varchar(20) NOT NULL CHECK (kind IN ('TRANSACTIONAL','OFFICIAL')),
  status varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  title varchar(255) NOT NULL,
  body text NOT NULL,
  published_by uuid NOT NULL REFERENCES identity.people(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance.bre_rules (
  code varchar(80) PRIMARY KEY,
  severity varchar(20) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
  module varchar(40) NOT NULL,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO compliance.bre_rules(code, severity, module, message) VALUES
  ('ACCREDITATION_EXPIRED','BLOCKING','identity','Credenciamento expirado.'),
  ('LICENSE_EXPIRED','BLOCKING','identity','Licenca/CMA vencido.'),
  ('TOXICOLOGICAL_EXPIRED','BLOCKING','compliance','Toxicologico 90 dias vencido.'),
  ('MEL_ITEM_EXPIRED','BLOCKING','ops','Item MEL vencido.'),
  ('DA_PENDING','BLOCKING','ops','DA prevalece sobre MEL.'),
  ('FUEL_INSUFFICIENT','BLOCKING','ops','Combustivel regulamentar insuficiente.'),
  ('TOOL_CALIBRATION_EXPIRED','BLOCKING','mro','Ferramenta com calibracao vencida.'),
  ('PART_RED_TAG','BLOCKING','mro','Peca com etiqueta vermelha.'),
  ('CRS_WITHOUT_SIGNATURE','BLOCKING','mro','CRS sem assinatura habilitada.'),
  ('SEGVOO_REQUIRED','BLOCKING','mro','SEGVOO 001 obrigatorio.'),
  ('AIRCRAFT_RAB_MISMATCH','BLOCKING','ops','Matricula divergente do RAB.'),
  ('LISTING_WITHOUT_INVENTORY','BLOCKING','market','Anuncio exige item de estoque.'),
  ('ENROLLMENT_DOUBLE_PERIOD','BLOCKING','training','Aluno no dobro do periodo letivo.'),
  ('SESCINC_RESPONSE_OVER_LIMIT','CRITICAL','airport','SESCINC acima de 180s.')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE market.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market.listings FORCE ROW LEVEL SECURITY;
ALTER TABLE market.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE market.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.threads FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.emails FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE oauth.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth.password_resets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mk_listings_tenant ON market.listings;
CREATE POLICY mk_listings_tenant ON market.listings
  USING (tenant_id = identity.current_tenant_id() OR status = 'PUBLICADO');
DROP POLICY IF EXISTS mk_orders_tenant ON market.orders;
CREATE POLICY mk_orders_tenant ON market.orders
  USING (tenant_id = identity.current_tenant_id() OR buyer_person_id = identity.current_person_id());
DROP POLICY IF EXISTS cm_threads_tenant ON communication.threads;
CREATE POLICY cm_threads_tenant ON communication.threads
  USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS cm_messages_tenant ON communication.messages;
CREATE POLICY cm_messages_tenant ON communication.messages
  USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS cm_emails_tenant ON communication.emails;
CREATE POLICY cm_emails_tenant ON communication.emails
  USING (tenant_id = identity.current_tenant_id() OR person_id = identity.current_person_id());
DROP POLICY IF EXISTS cm_ann_tenant ON communication.announcements;
CREATE POLICY cm_ann_tenant ON communication.announcements
  USING (tenant_id = identity.current_tenant_id());
DROP POLICY IF EXISTS oauth_reset_self ON oauth.password_resets;
CREATE POLICY oauth_reset_self ON oauth.password_resets
  USING (person_id = identity.current_person_id());

GRANT USAGE ON SCHEMA market TO vortex_app;
GRANT USAGE ON SCHEMA communication TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA market TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA communication TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON oauth.password_resets TO vortex_app;
GRANT SELECT ON compliance.bre_rules TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA market TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA communication TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA market GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA communication GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vortex_app;
