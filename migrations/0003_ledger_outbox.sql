-- ============================================================
-- VORTEX v4 — Ledger (append-only) + outbox
-- Fonte: árvore v1, migração 0003. Resolução ANAC 458/2017.
-- ============================================================

CREATE TABLE ledger.ledger_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  previous_hash varchar(64) NOT NULL,
  hash varchar(64) NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT clock_timestamp(),
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
  chain_position bigint,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

CREATE TABLE ledger.ledger_blocks_default PARTITION OF ledger.ledger_blocks DEFAULT;
CREATE INDEX idx_ledger_entity ON ledger.ledger_blocks(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_ledger_tenant_time ON ledger.ledger_blocks(tenant_id, timestamp DESC);
CREATE INDEX idx_ledger_chain_position ON ledger.ledger_blocks(tenant_id, chain_position) WHERE chain_position IS NOT NULL;

-- Imutabilidade: UPDATE e DELETE são bloqueados por trigger (regra 2 do contrato).
CREATE FUNCTION ledger.prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO REGULATÓRIA: ledger VORTEX é append-only; UPDATE e DELETE são proibidos.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE ON ledger.ledger_blocks FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();
CREATE TRIGGER trg_ledger_no_delete BEFORE DELETE ON ledger.ledger_blocks FOR EACH ROW EXECUTE FUNCTION ledger.prevent_ledger_mutation();

CREATE TABLE ledger.chain_heads (
  tenant_id uuid PRIMARY KEY REFERENCES identity.tenants(id),
  last_hash varchar(64) NOT NULL DEFAULT repeat('0', 64),
  last_position bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

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

-- Referência diferida a bloco do ledger (o bloco é inserido na mesma transação).
CREATE FUNCTION ledger.validate_deferred_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
BEGIN
  IF NEW.ledger_block_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ledger.ledger_blocks block WHERE block.id = NEW.ledger_block_id
  ) THEN
    RAISE EXCEPTION 'Referência ao ledger inexistente: %', NEW.ledger_block_id USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
