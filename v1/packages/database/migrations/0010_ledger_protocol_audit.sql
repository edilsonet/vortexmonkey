CREATE TABLE ledger.verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  status varchar(20) NOT NULL CHECK (status IN ('VALID','TAMPERED','ERROR')),
  total_blocks bigint NOT NULL DEFAULT 0,
  first_broken_block uuid,
  last_hash varchar(64),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ledger_block_id uuid NOT NULL,
  triggered_by varchar(20) NOT NULL CHECK (triggered_by IN ('API','SCHEDULED'))
);

CREATE TABLE ledger.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid REFERENCES identity.companies(id),
  request_id text NOT NULL,
  ip_address inet,
  user_agent text,
  action varchar(120) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid,
  outcome varchar(20) NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE')),
  status_code integer NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_hash varchar(64),
  ledger_block_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON ledger.audit_events(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_entity ON ledger.audit_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_user_time ON ledger.audit_events(user_id, occurred_at DESC);

CREATE TABLE protocol.sequences (
  year integer PRIMARY KEY CHECK (year BETWEEN 2000 AND 9999),
  last_sequence bigint NOT NULL DEFAULT 0 CHECK (last_sequence BETWEEN 0 AND 999999)
);

CREATE TABLE protocol.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  protocol_number varchar(20) UNIQUE NOT NULL CHECK (protocol_number ~ '^[0-9]{4}-[0-9]{6}$'),
  year integer NOT NULL,
  sequence bigint NOT NULL CHECK (sequence BETWEEN 1 AND 999999),
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  subject varchar(255) NOT NULL,
  access_level varchar(20) NOT NULL CHECK (access_level IN ('PUBLIC','RESTRICTED','PRIVATE')),
  restriction_basis varchar(40) CHECK (restriction_basis IN ('LGPD_PERSONAL_DATA','BUSINESS_CONFIDENTIALITY','NATIONAL_SECURITY','ONGOING_PROCESS')),
  contains_personal_data boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','ARCHIVED')),
  ledger_block_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, sequence),
  CHECK (NOT contains_personal_data OR access_level <> 'PUBLIC'),
  CHECK ((access_level = 'PUBLIC' AND restriction_basis IS NULL) OR (access_level <> 'PUBLIC' AND restriction_basis IS NOT NULL))
);
CREATE INDEX idx_protocol_tenant_created ON protocol.protocols(tenant_id, created_at DESC);
CREATE INDEX idx_protocol_entity ON protocol.protocols(entity_type, entity_id);

CREATE TABLE protocol.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES protocol.protocols(id),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  event_type varchar(80) NOT NULL,
  description varchar(500) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_level varchar(20) NOT NULL CHECK (access_level IN ('PUBLIC','RESTRICTED','PRIVATE')),
  restriction_basis varchar(40) CHECK (restriction_basis IN ('LGPD_PERSONAL_DATA','BUSINESS_CONFIDENTIALITY','NATIONAL_SECURITY','ONGOING_PROCESS')),
  ledger_block_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((access_level = 'PUBLIC' AND restriction_basis IS NULL) OR (access_level <> 'PUBLIC' AND restriction_basis IS NOT NULL))
);
CREATE INDEX idx_protocol_timeline ON protocol.timeline_events(protocol_id, occurred_at, id);

CREATE TABLE protocol.protocol_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES protocol.protocols(id),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  requested_by uuid NOT NULL REFERENCES identity.users(id),
  justification varchar(1000) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','GRANTED','DENIED','EXPIRED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  response_due_at timestamptz NOT NULL,
  decided_at timestamptz,
  decided_by uuid REFERENCES identity.users(id),
  granted_until timestamptz,
  decision_reason varchar(1000),
  ledger_block_id uuid NOT NULL,
  decision_ledger_block_id uuid,
  CHECK ((status = 'PENDING' AND decided_at IS NULL AND decided_by IS NULL AND granted_until IS NULL) OR
         (status = 'GRANTED' AND decided_at IS NOT NULL AND decided_by IS NOT NULL AND granted_until IS NOT NULL) OR
         (status IN ('DENIED','EXPIRED') AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
);
CREATE INDEX idx_protocol_views_due ON protocol.protocol_views(status, response_due_at);
CREATE INDEX idx_protocol_views_requester ON protocol.protocol_views(requested_by, requested_at DESC);

CREATE FUNCTION protocol.next_protocol_number()
RETURNS TABLE(year integer, sequence bigint, protocol_number varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = protocol, pg_temp AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM timezone('UTC', now()))::integer;
  v_sequence bigint;
BEGIN
  INSERT INTO protocol.sequences AS sequence_row(year, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_sequence = sequence_row.last_sequence + 1
  RETURNING last_sequence INTO v_sequence;
  IF v_sequence > 999999 THEN
    RAISE EXCEPTION 'Limite anual de protocolos atingido para %.', v_year USING ERRCODE = '22003';
  END IF;
  RETURN QUERY SELECT v_year, v_sequence, format('%s-%s', v_year, lpad(v_sequence::text, 6, '0'))::varchar;
END;
$$;

CREATE FUNCTION protocol.public_search(p_query text DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS TABLE(protocol_number varchar, subject varchar, entity_type varchar, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = protocol, pg_temp AS $$
  SELECT p.protocol_number, p.subject, p.entity_type, p.created_at
  FROM protocol.protocols p
  WHERE p.access_level = 'PUBLIC'
    AND p.contains_personal_data = false
    AND (nullif(trim(p_query), '') IS NULL OR p.protocol_number ILIKE '%' || trim(p_query) || '%' OR p.subject ILIKE '%' || trim(p_query) || '%')
  ORDER BY p.created_at DESC
  LIMIT least(greatest(p_limit, 1), 100)
$$;

CREATE FUNCTION identity.current_company_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_company_id', true), '')::uuid
$$;

CREATE FUNCTION protocol.requestable_protocol(p_protocol_id uuid)
RETURNS TABLE(id uuid, tenant_id uuid, company_id uuid, access_level varchar, created_by uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = protocol, identity, pg_temp AS $$
  SELECT p.id, p.tenant_id, p.company_id, p.access_level, p.created_by
  FROM protocol.protocols p
  WHERE p.id = p_protocol_id
    AND p.tenant_id IN (SELECT identity.current_tenant_ids())
$$;

CREATE FUNCTION ledger.ensure_monthly_partitions(p_months_ahead integer DEFAULT 3)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
DECLARE
  v_offset integer;
  v_start timestamptz;
  v_end timestamptz;
  v_name text;
  v_created integer := 0;
BEGIN
  IF p_months_ahead < 1 OR p_months_ahead > 24 THEN
    RAISE EXCEPTION 'Horizonte de partições deve estar entre 1 e 24 meses.' USING ERRCODE = '22023';
  END IF;
  FOR v_offset IN 0..p_months_ahead LOOP
    v_start := date_trunc('month', timezone('UTC', now())) + make_interval(months => v_offset);
    v_end := v_start + interval '1 month';
    v_name := 'ledger_blocks_' || to_char(v_start, 'YYYY_MM');
    IF to_regclass('ledger.' || v_name) IS NULL THEN
      IF EXISTS (SELECT 1 FROM ledger.ledger_blocks_default WHERE timestamp >= v_start AND timestamp < v_end) THEN
        CONTINUE;
      END IF;
      EXECUTE format('CREATE TABLE ledger.%I PARTITION OF ledger.ledger_blocks FOR VALUES FROM (%L) TO (%L)', v_name, v_start, v_end);
      EXECUTE format('ALTER TABLE ledger.%I ENABLE ROW LEVEL SECURITY', v_name);
      EXECUTE format('ALTER TABLE ledger.%I FORCE ROW LEVEL SECURITY', v_name);
      v_created := v_created + 1;
    END IF;
  END LOOP;
  RETURN v_created;
END;
$$;

CREATE FUNCTION ledger.verification_contexts()
RETURNS TABLE(tenant_id uuid, user_id uuid, company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT DISTINCT ON (tu.tenant_id) tu.tenant_id, tu.user_id,
    (SELECT r.company_id FROM identity.relationships r
      WHERE r.tenant_id = tu.tenant_id AND r.user_id = tu.user_id AND r.status = 'ACTIVE'
        AND (r.starts_at IS NULL OR r.starts_at <= now()) AND (r.expires_at IS NULL OR r.expires_at > now())
      ORDER BY r.created_at LIMIT 1)
  FROM identity.tenant_users tu
  WHERE tu.status = 'ACTIVE'
  ORDER BY tu.tenant_id, tu.user_id
$$;

CREATE FUNCTION protocol.prevent_timeline_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: a timeline do protocolo é imutável; UPDATE e DELETE são proibidos.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION ledger.prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: a trilha de auditoria é imutável; UPDATE e DELETE são proibidos.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protocol_timeline_no_update BEFORE UPDATE ON protocol.timeline_events FOR EACH ROW EXECUTE FUNCTION protocol.prevent_timeline_mutation();
CREATE TRIGGER trg_protocol_timeline_no_delete BEFORE DELETE ON protocol.timeline_events FOR EACH ROW EXECUTE FUNCTION protocol.prevent_timeline_mutation();
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON ledger.audit_events FOR EACH ROW EXECUTE FUNCTION ledger.prevent_audit_mutation();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON ledger.audit_events FOR EACH ROW EXECUTE FUNCTION ledger.prevent_audit_mutation();
CREATE TRIGGER trg_verification_no_update BEFORE UPDATE ON ledger.verification_runs FOR EACH ROW EXECUTE FUNCTION ledger.prevent_audit_mutation();
CREATE TRIGGER trg_verification_no_delete BEFORE DELETE ON ledger.verification_runs FOR EACH ROW EXECUTE FUNCTION ledger.prevent_audit_mutation();

CREATE CONSTRAINT TRIGGER protocol_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON protocol.protocols
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER timeline_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON protocol.timeline_events
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER view_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON protocol.protocol_views
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER view_decision_ledger_reference
AFTER INSERT OR UPDATE OF decision_ledger_block_id ON protocol.protocol_views
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER audit_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ledger.audit_events
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
CREATE CONSTRAINT TRIGGER verification_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON ledger.verification_runs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

ALTER TABLE protocol.protocols ENABLE ROW LEVEL SECURITY; ALTER TABLE protocol.protocols FORCE ROW LEVEL SECURITY;
ALTER TABLE protocol.timeline_events ENABLE ROW LEVEL SECURITY; ALTER TABLE protocol.timeline_events FORCE ROW LEVEL SECURITY;
ALTER TABLE protocol.protocol_views ENABLE ROW LEVEL SECURITY; ALTER TABLE protocol.protocol_views FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger.audit_events ENABLE ROW LEVEL SECURITY; ALTER TABLE ledger.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger.verification_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE ledger.verification_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY protocols_select ON protocol.protocols FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND (
    access_level = 'PUBLIC' OR created_by = identity.current_user_id() OR
    (access_level = 'RESTRICTED' AND company_id = identity.current_company_id()) OR
    EXISTS (SELECT 1 FROM protocol.protocol_views v WHERE v.protocol_id = id AND v.requested_by = identity.current_user_id() AND v.status = 'GRANTED' AND v.granted_until > now())
  )
);
CREATE POLICY protocols_insert ON protocol.protocols FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id = identity.current_company_id() AND user_id = identity.current_user_id() AND created_by = identity.current_user_id()
);
CREATE POLICY timeline_select ON protocol.timeline_events FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND protocol_id IN (SELECT id FROM protocol.protocols)
);
CREATE POLICY timeline_insert ON protocol.timeline_events FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id = identity.current_company_id() AND user_id = identity.current_user_id() AND created_by = identity.current_user_id()
);
CREATE POLICY views_select ON protocol.protocol_views FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND (requested_by = identity.current_user_id() OR user_id = identity.current_user_id() OR company_id = identity.current_company_id())
);
CREATE POLICY views_insert ON protocol.protocol_views FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id = identity.current_company_id() AND requested_by = identity.current_user_id() AND user_id = identity.current_user_id()
);
CREATE POLICY views_update ON protocol.protocol_views FOR UPDATE USING (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id = identity.current_company_id()
) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id = identity.current_company_id());
CREATE POLICY audit_select ON ledger.audit_events FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY audit_insert ON ledger.audit_events FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());
CREATE POLICY verification_select ON ledger.verification_runs FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY verification_insert ON ledger.verification_runs FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());

REVOKE ALL ON protocol.sequences FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION protocol.next_protocol_number(), protocol.public_search(text, integer), protocol.requestable_protocol(uuid), ledger.ensure_monthly_partitions(integer), ledger.verification_contexts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION protocol.next_protocol_number(), protocol.public_search(text, integer), protocol.requestable_protocol(uuid), ledger.ensure_monthly_partitions(integer), ledger.verification_contexts() TO vortex_app;
GRANT EXECUTE ON FUNCTION identity.current_company_id() TO vortex_app;
GRANT SELECT, INSERT ON protocol.protocols, protocol.timeline_events TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON protocol.protocol_views TO vortex_app;
GRANT SELECT, INSERT ON ledger.audit_events, ledger.verification_runs TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA protocol, ledger TO vortex_app;

INSERT INTO compliance.regulatory_parameters(key, version, value, legal_reference, effective_from, source_document, checksum) VALUES
('protocol.view.response_days', 1, '5', 'Resolução ANAC 520/2019', DATE '2026-01-01', 'docs/canonical/prompts/parte-2.md', encode(digest('5', 'sha256'), 'hex')),
('protocol.view.access_days', 1, '10', 'Resolução ANAC 520/2019', DATE '2026-01-01', 'docs/canonical/prompts/parte-2.md', encode(digest('10', 'sha256'), 'hex')),
('ledger.partition.months_ahead', 1, '3', 'Resolução ANAC 458/2017', DATE '2026-01-01', 'docs/canonical/prompts/parte-2.md', encode(digest('3', 'sha256'), 'hex')),
('ledger.verification.interval_hours', 1, '24', 'Resolução ANAC 458/2017', DATE '2026-01-01', 'docs/canonical/02-parametros-prazos.md', encode(digest('24', 'sha256'), 'hex'));

SELECT ledger.ensure_monthly_partitions(3);
