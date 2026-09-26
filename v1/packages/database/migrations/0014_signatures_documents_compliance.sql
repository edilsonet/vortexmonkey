-- ============================================================
-- VORTEX — Fase 3: Assinatura Digital, Documentos e Compliance
-- Lei 14.063/2020, MP 2.200-2/2001, Decreto 10.543/2020, LGPD
-- ============================================================

-- ─────────────────────────────────────────────
-- SCHEMA: signatures
-- ─────────────────────────────────────────────

CREATE TABLE signatures.signature_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL CHECK (level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE signatures.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    signer_user_id UUID NOT NULL REFERENCES identity.users(id),
    signer_company_id UUID REFERENCES identity.companies(id),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    signature_level VARCHAR(50) NOT NULL CHECK (signature_level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
    provider_code VARCHAR(50) NOT NULL,
    provider_reference VARCHAR(255),
    method VARCHAR(50) NOT NULL CHECK (method IN ('SENHA','GOVBR_2FA','CERTIFICADO_A1','CERTIFICADO_A3')),
    certificate_serial VARCHAR(100),
    certificate_issuer VARCHAR(255),
    certificate_subject VARCHAR(500),
    certificate_valid_from TIMESTAMPTZ,
    certificate_valid_to TIMESTAMPTZ,
    timestamp_bsb TIMESTAMPTZ NOT NULL DEFAULT now(),
    tsa_token TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    verification_code VARCHAR(50) NOT NULL UNIQUE,
    crc_code VARCHAR(20) NOT NULL,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_signatures_document ON signatures.signatures(document_id);
CREATE INDEX idx_signatures_user ON signatures.signatures(signer_user_id, created_at DESC);
CREATE INDEX idx_signatures_tenant ON signatures.signatures(tenant_id, created_at DESC);
CREATE INDEX idx_signatures_code ON signatures.signatures(verification_code);

CREATE TABLE signatures.signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    requested_by UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID REFERENCES identity.companies(id),
    required_level VARCHAR(50) NOT NULL CHECK (required_level IN ('SIMPLE','AVANCADA','QUALIFICADA')),
    signers JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SIGNED','PARTIALLY_SIGNED','REJECTED','EXPIRED')),
    expires_at TIMESTAMPTZ,
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sig_requests_document ON signatures.signature_requests(document_id);
CREATE INDEX idx_sig_requests_tenant ON signatures.signature_requests(tenant_id, created_at DESC);

-- Imutabilidade das assinaturas (Regra 2: append-only)
CREATE FUNCTION signatures.prevent_signature_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: assinaturas são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signatures_no_update BEFORE UPDATE ON signatures.signatures
    FOR EACH ROW EXECUTE FUNCTION signatures.prevent_signature_mutation();
CREATE TRIGGER trg_signatures_no_delete BEFORE DELETE ON signatures.signatures
    FOR EACH ROW EXECUTE FUNCTION signatures.prevent_signature_mutation();

-- RLS — signatures
ALTER TABLE signatures.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures.signatures FORCE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures.signature_providers FORCE ROW LEVEL SECURITY;

CREATE POLICY signatures_select ON signatures.signatures FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY signatures_insert ON signatures.signatures FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND signer_user_id = identity.current_user_id());

CREATE POLICY sig_requests_select ON signatures.signature_requests FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY sig_requests_insert ON signatures.signature_requests FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND requested_by = identity.current_user_id());
CREATE POLICY sig_requests_update ON signatures.signature_requests FOR UPDATE
    USING (tenant_id IN (SELECT identity.current_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

CREATE POLICY providers_select ON signatures.signature_providers FOR SELECT USING (true);

-- ─────────────────────────────────────────────
-- SCHEMA: documents
-- ─────────────────────────────────────────────

CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    classification VARCHAR(50) NOT NULL CHECK (classification IN ('PUBLIC','RESTRICTED','PRIVATE')),
    contains_personal_data BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','PENDING_SIGN','SIGNED','ARCHIVED')),
    document_type VARCHAR(100),
    protocol_id UUID,
    owner_type VARCHAR(100),
    owner_id UUID,
    created_by UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID REFERENCES identity.companies(id),
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Dado pessoal nunca pode ser PUBLIC (Regra LGPD)
    CHECK (NOT contains_personal_data OR classification <> 'PUBLIC')
);
CREATE INDEX idx_documents_tenant ON documents.documents(tenant_id, created_at DESC);
CREATE INDEX idx_documents_owner ON documents.documents(owner_type, owner_id);
CREATE INDEX idx_documents_protocol ON documents.documents(protocol_id) WHERE protocol_id IS NOT NULL;
CREATE INDEX idx_documents_hash ON documents.documents(hash);

CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents.documents(id),
    version INT NOT NULL CHECK (version >= 1),
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    change_note VARCHAR(500),
    created_by UUID NOT NULL REFERENCES identity.users(id),
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, version)
);
CREATE INDEX idx_doc_versions_document ON documents.document_versions(document_id, version DESC);

-- Imutabilidade de versões
CREATE FUNCTION documents.prevent_version_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO: versões de documentos são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doc_versions_no_update BEFORE UPDATE ON documents.document_versions
    FOR EACH ROW EXECUTE FUNCTION documents.prevent_version_mutation();
CREATE TRIGGER trg_doc_versions_no_delete BEFORE DELETE ON documents.document_versions
    FOR EACH ROW EXECUTE FUNCTION documents.prevent_version_mutation();

-- RLS — documents
ALTER TABLE documents.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE documents.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents.document_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents.documents FOR SELECT
    USING (
        tenant_id IN (SELECT identity.current_tenant_ids()) AND (
            classification = 'PUBLIC'
            OR created_by = identity.current_user_id()
            OR (classification = 'RESTRICTED' AND company_id = identity.current_company_id())
        )
    );
CREATE POLICY documents_insert ON documents.documents FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT identity.current_tenant_ids())
        AND created_by = identity.current_user_id()
        AND company_id = identity.current_company_id()
    );
CREATE POLICY documents_update ON documents.documents FOR UPDATE
    USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND created_by = identity.current_user_id())
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

CREATE POLICY doc_versions_select ON documents.document_versions FOR SELECT
    USING (document_id IN (SELECT id FROM documents.documents));
CREATE POLICY doc_versions_insert ON documents.document_versions FOR INSERT
    WITH CHECK (created_by = identity.current_user_id());

-- ─────────────────────────────────────────────
-- SCHEMA: compliance
-- ─────────────────────────────────────────────

CREATE TABLE compliance.lgpd_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    company_id UUID REFERENCES identity.companies(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('EXPORT','ERASURE','CONSENT_REVOKE')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    justification VARCHAR(1000),
    storage_key VARCHAR(512),
    result_summary JSONB DEFAULT '{}',
    ledger_block_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_lgpd_requests_user ON compliance.lgpd_requests(user_id, created_at DESC);
CREATE INDEX idx_lgpd_requests_tenant ON compliance.lgpd_requests(tenant_id, created_at DESC);
CREATE INDEX idx_lgpd_requests_type ON compliance.lgpd_requests(request_type, status);

CREATE TABLE compliance.consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('CONSENT_GRANTED','CONSENT_REVOKED')),
    purpose VARCHAR(255) NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    ledger_block_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_user ON compliance.consent_events(user_id, occurred_at DESC);

-- Imutabilidade de compliance
CREATE FUNCTION compliance.prevent_compliance_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO LGPD: registros de compliance são imutáveis; UPDATE e DELETE são proibidos.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consent_no_update BEFORE UPDATE ON compliance.consent_events
    FOR EACH ROW EXECUTE FUNCTION compliance.prevent_compliance_mutation();
CREATE TRIGGER trg_consent_no_delete BEFORE DELETE ON compliance.consent_events
    FOR EACH ROW EXECUTE FUNCTION compliance.prevent_compliance_mutation();

-- RLS — compliance
ALTER TABLE compliance.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.lgpd_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.consent_events FORCE ROW LEVEL SECURITY;

CREATE POLICY lgpd_requests_select ON compliance.lgpd_requests FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());
CREATE POLICY lgpd_requests_insert ON compliance.lgpd_requests FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());
CREATE POLICY lgpd_requests_update ON compliance.lgpd_requests FOR UPDATE
    USING (tenant_id IN (SELECT identity.current_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

CREATE POLICY consent_select ON compliance.consent_events FOR SELECT
    USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());
CREATE POLICY consent_insert ON compliance.consent_events FOR INSERT
    WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());

-- ─────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT ON signatures.signature_providers TO vortex_app;
GRANT SELECT, INSERT ON signatures.signatures TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON signatures.signature_requests TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON documents.documents TO vortex_app;
GRANT SELECT, INSERT ON documents.document_versions TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON compliance.lgpd_requests TO vortex_app;
GRANT SELECT, INSERT ON compliance.consent_events TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA signatures, documents, compliance TO vortex_app;

-- ─────────────────────────────────────────────
-- SEEDS: provedores padrão
-- ─────────────────────────────────────────────
INSERT INTO signatures.signature_providers(code, name, level, config, status) VALUES
('SIMPLE',       'Assinatura Simples (senha)', 'SIMPLE',      '{"method":"SENHA"}',            'ACTIVE'),
('GOVBR',        'Gov.br (prata/ouro + 2FA)',  'AVANCADA',    '{"method":"GOVBR_2FA"}',        'ACTIVE'),
('ICP_SERPRO',   'ICP-Brasil via Serpro',      'QUALIFICADA', '{"method":"CERTIFICADO_A1"}',   'ACTIVE'),
('ICP_CERTISIGN','ICP-Brasil via Certisign',   'QUALIFICADA', '{"method":"CERTIFICADO_A3"}',   'ACTIVE');

-- Parâmetro de validade da presigned URL (em minutos)
INSERT INTO compliance.regulatory_parameters(key, version, value, legal_reference, effective_from, source_document, checksum) VALUES
('document.presigned_url.expiry_minutes', 1, '5', 'LGPD art. 46', DATE '2026-01-01', 'docs/prompts/parte-3.md', encode(digest('5', 'sha256'), 'hex'))
ON CONFLICT DO NOTHING;
