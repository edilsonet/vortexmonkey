ALTER TABLE ledger.ledger_blocks ADD COLUMN chain_position bigint;
ALTER TABLE ledger.ledger_blocks ALTER COLUMN timestamp SET DEFAULT clock_timestamp();

CREATE TABLE ledger.chain_heads (
  tenant_id uuid PRIMARY KEY REFERENCES identity.tenants(id),
  last_hash varchar(64) NOT NULL DEFAULT repeat('0', 64),
  last_position bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

INSERT INTO ledger.chain_heads(tenant_id,last_hash,last_position)
SELECT DISTINCT ON (tenant_id) tenant_id, hash,
  count(*) OVER (PARTITION BY tenant_id) AS last_position
FROM ledger.ledger_blocks
ORDER BY tenant_id,timestamp DESC,id DESC
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE ledger.chain_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.chain_heads FORCE ROW LEVEL SECURITY;
CREATE POLICY chain_heads_select ON ledger.chain_heads FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY chain_heads_insert ON ledger.chain_heads FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY chain_heads_update ON ledger.chain_heads FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
GRANT SELECT,INSERT,UPDATE ON ledger.chain_heads TO vortex_app;
CREATE INDEX idx_ledger_chain_position ON ledger.ledger_blocks(tenant_id,chain_position) WHERE chain_position IS NOT NULL;
