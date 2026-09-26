BEGIN;

INSERT INTO identity.tenants(id, name, type)
VALUES ('10000000-0000-4000-8000-000000000001', 'Teste Ledger', 'ERP');
INSERT INTO identity.users(id, cpf, full_name, email)
VALUES ('10000000-0000-4000-8000-000000000002', '52998224725', 'Auditor Ledger', 'auditor-ledger@example.test');
INSERT INTO ledger.ledger_blocks(
  id, previous_hash, hash, tenant_id, user_id, entity_type, entity_id,
  action_type, payload, created_by, signature
) VALUES (
  '10000000-0000-4000-8000-000000000003', repeat('0',64), repeat('1',64),
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
  'ACCEPTANCE_TEST', '10000000-0000-4000-8000-000000000004', 'INSERT', '{}',
  '10000000-0000-4000-8000-000000000002', 'test-signature'
);

DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    UPDATE ledger.ledger_blocks SET payload = '{"tampered":true}' WHERE id = '10000000-0000-4000-8000-000000000003';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'Falha: o ledger aceitou UPDATE.';
  END IF;
  RAISE NOTICE 'Imutabilidade aprovada: UPDATE bloqueado pelo trigger regulatório.';
END $$;

ROLLBACK;
