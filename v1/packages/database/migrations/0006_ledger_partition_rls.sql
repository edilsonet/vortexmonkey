ALTER TABLE ledger.ledger_blocks_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.ledger_blocks_default FORCE ROW LEVEL SECURITY;

REVOKE ALL ON ledger.ledger_blocks_default FROM PUBLIC;
REVOKE ALL ON ledger.ledger_blocks_default FROM vortex_app;
