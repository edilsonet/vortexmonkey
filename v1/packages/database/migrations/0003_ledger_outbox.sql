CREATE TABLE ledger.ledger_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  previous_hash varchar(64) NOT NULL,
  hash varchar(64) NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid REFERENCES identity.companies(id),
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  action_type varchar(50) NOT NULL,
  payload jsonb NOT NULL,
  changes jsonb,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  signature text NOT NULL,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

CREATE TABLE ledger.ledger_blocks_default PARTITION OF ledger.ledger_blocks DEFAULT;
CREATE INDEX idx_ledger_entity ON ledger.ledger_blocks(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_ledger_tenant_time ON ledger.ledger_blocks(tenant_id, timestamp DESC);

CREATE FUNCTION ledger.prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: ledger VORTEX é append-only; UPDATE e DELETE são proibidos.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE ON ledger.ledger_blocks FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();
CREATE TRIGGER trg_ledger_no_delete BEFORE DELETE ON ledger.ledger_blocks FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();

CREATE TABLE ledger.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid REFERENCES identity.companies(id),
  aggregate_type varchar(100) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type varchar(120) NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
CREATE INDEX idx_outbox_unpublished ON ledger.outbox_events(occurred_at) WHERE published_at IS NULL;


CREATE FUNCTION ledger.claim_outbox_events(p_limit integer)
RETURNS TABLE(id uuid, tenant_id uuid, event_type varchar, payload jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.outbox_events target
  SET attempts = target.attempts + 1
  WHERE target.id IN (
    SELECT pending.id FROM ledger.outbox_events pending
    WHERE pending.published_at IS NULL
    ORDER BY pending.occurred_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING target.id, target.tenant_id, target.event_type, target.payload
$$;

CREATE FUNCTION ledger.mark_outbox_published(p_ids uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.outbox_events SET published_at = now() WHERE id = ANY(p_ids) AND published_at IS NULL
$$;

REVOKE ALL ON FUNCTION ledger.claim_outbox_events(integer), ledger.mark_outbox_published(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ledger.claim_outbox_events(integer), ledger.mark_outbox_published(uuid[]) TO vortex_app;
