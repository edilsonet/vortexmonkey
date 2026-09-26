CREATE TABLE ledger.ledger_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigserial UNIQUE NOT NULL,
  tenant_id uuid REFERENCES identity.tenants(id),
  actor_person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  entity_type varchar(80) NOT NULL,
  entity_id uuid NOT NULL,
  action_type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash varchar(64),
  hash varchar(64) NOT NULL,
  signature varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger.chain_heads (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_block_id uuid REFERENCES ledger.ledger_blocks(id),
  last_hash varchar(64),
  last_seq bigint NOT NULL DEFAULT 0
);

INSERT INTO ledger.chain_heads(id, last_seq) VALUES (1, 0);

CREATE TABLE ledger.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  actor_person_id uuid,
  company_id uuid,
  aggregate_type varchar(80) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type varchar(120) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ledger.forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'LEDGER_IMMUTABLE' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger.ledger_blocks
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_mutation();
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger.ledger_blocks
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_mutation();

CREATE TABLE protocol.sequences (
  year int PRIMARY KEY,
  last_seq int NOT NULL DEFAULT 0
);

CREATE TABLE protocol.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number varchar(11) NOT NULL UNIQUE CHECK (number ~ '^[0-9]{4}-[0-9]{6}$'),
  tenant_id uuid REFERENCES identity.tenants(id),
  actor_person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  subject varchar(255) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','ARCHIVED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE protocol.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES protocol.protocols(id),
  event_type varchar(80) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
