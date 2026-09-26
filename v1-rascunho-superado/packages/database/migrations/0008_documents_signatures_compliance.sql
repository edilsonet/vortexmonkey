CREATE TABLE signatures.signature_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  level varchar(50) NOT NULL CHECK (level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);

INSERT INTO signatures.signature_providers(code, name, level, config, status) VALUES
  ('SIMPLE', 'VORTEX Senha', 'SIMPLE', '{}'::jsonb, 'ACTIVE'),
  ('GOVBR', 'Gov.br 2FA', 'AVANCADA', '{}'::jsonb, 'ACTIVE'),
  ('ICP_SERPRO', 'ICP-Brasil Serpro A1', 'QUALIFICADA', '{}'::jsonb, 'ACTIVE'),
  ('ICP_CERTISIGN', 'ICP-Brasil Certisign A3', 'QUALIFICADA', '{}'::jsonb, 'ACTIVE');

CREATE TABLE documents.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES identity.tenants(id),
  name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  hash varchar(64) NOT NULL,
  storage_key varchar(512) NOT NULL,
  classification varchar(50) NOT NULL CHECK (classification IN ('PUBLIC','RESTRICTED','PRIVATE')),
  contains_personal_data boolean NOT NULL DEFAULT false,
  status varchar(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_SIGN','SIGNED','ARCHIVED')),
  document_type varchar(100),
  protocol_id uuid,
  owner_type varchar(100),
  owner_id uuid,
  created_by uuid NOT NULL REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT contains_personal_data OR classification <> 'PUBLIC')
);

CREATE TABLE documents.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents.documents(id),
  version int NOT NULL CHECK (version >= 1),
  hash varchar(64) NOT NULL,
  storage_key varchar(512) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  change_note varchar(500),
  created_by uuid NOT NULL REFERENCES identity.people(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

CREATE TABLE signatures.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents.documents(id),
  document_hash varchar(64) NOT NULL,
  signer_person_id uuid NOT NULL REFERENCES identity.people(id),
  signer_company_id uuid REFERENCES identity.companies(id),
  tenant_id uuid REFERENCES identity.tenants(id),
  signature_level varchar(50) NOT NULL CHECK (signature_level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
  provider_code varchar(50) NOT NULL,
  provider_reference varchar(255),
  method varchar(50) NOT NULL CHECK (method IN ('SENHA','GOVBR_2FA','CERTIFICADO_A1','CERTIFICADO_A3')),
  certificate_serial varchar(100),
  certificate_issuer varchar(255),
  timestamp_bsb timestamptz NOT NULL DEFAULT now(),
  tsa_token text,
  ip_address varchar(45),
  user_agent varchar(512),
  verification_code varchar(50) NOT NULL UNIQUE,
  crc_code varchar(20) NOT NULL,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signatures.signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents.documents(id),
  tenant_id uuid REFERENCES identity.tenants(id),
  requested_by uuid NOT NULL REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  required_level varchar(50) NOT NULL CHECK (required_level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
  signers jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(50) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SIGNED','PARTIALLY_SIGNED','REJECTED','EXPIRED')),
  expires_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compliance.lgpd_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES identity.tenants(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  request_type varchar(50) NOT NULL CHECK (request_type IN ('EXPORT','ERASURE','CONSENT_REVOKE')),
  status varchar(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','REJECTED')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION signatures.forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SIGNATURES_IMMUTABLE' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER signatures_no_update BEFORE UPDATE ON signatures.signatures
  FOR EACH ROW EXECUTE FUNCTION signatures.forbid_mutation();
CREATE TRIGGER signatures_no_delete BEFORE DELETE ON signatures.signatures
  FOR EACH ROW EXECUTE FUNCTION signatures.forbid_mutation();

CREATE OR REPLACE FUNCTION documents.forbid_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'DOCUMENT_VERSION_IMMUTABLE' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER doc_versions_no_update BEFORE UPDATE ON documents.document_versions
  FOR EACH ROW EXECUTE FUNCTION documents.forbid_version_mutation();
CREATE TRIGGER doc_versions_no_delete BEFORE DELETE ON documents.document_versions
  FOR EACH ROW EXECUTE FUNCTION documents.forbid_version_mutation();

ALTER TABLE documents.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE documents.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents.document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE signatures.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures.signatures FORCE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.lgpd_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant ON documents.documents
  USING (tenant_id = identity.current_tenant_id() OR created_by = identity.current_person_id());
CREATE POLICY doc_versions_via_doc ON documents.document_versions
  USING (document_id IN (SELECT id FROM documents.documents));
CREATE POLICY signatures_tenant ON signatures.signatures
  USING (tenant_id = identity.current_tenant_id() OR signer_person_id = identity.current_person_id());
CREATE POLICY sig_requests_tenant ON signatures.signature_requests
  USING (tenant_id = identity.current_tenant_id() OR requested_by = identity.current_person_id());
CREATE POLICY lgpd_self ON compliance.lgpd_requests
  USING (person_id = identity.current_person_id() OR tenant_id = identity.current_tenant_id());

GRANT USAGE ON SCHEMA documents, signatures, compliance TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA documents TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA signatures TO vortex_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA compliance TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA documents TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA signatures TO vortex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA compliance TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA documents TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA signatures TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA compliance TO vortex_app;
