DO $$
DECLARE
  v_timeline uuid;
  v_audit uuid;
  v_block uuid;
  v_block_time timestamptz;
  v_blocked boolean;
BEGIN
  SELECT id INTO v_timeline FROM protocol.timeline_events ORDER BY occurred_at LIMIT 1;
  IF v_timeline IS NULL THEN RAISE EXCEPTION 'Nenhum evento de timeline disponível para o teste.'; END IF;

  v_blocked := false;
  BEGIN UPDATE protocol.timeline_events SET description='ALTERADO' WHERE id=v_timeline; EXCEPTION WHEN sqlstate '55000' THEN v_blocked := true; END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Timeline aceitou UPDATE.'; END IF;

  v_blocked := false;
  BEGIN DELETE FROM protocol.timeline_events WHERE id=v_timeline; EXCEPTION WHEN sqlstate '55000' THEN v_blocked := true; END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Timeline aceitou DELETE.'; END IF;

  SELECT id INTO v_audit FROM ledger.audit_events ORDER BY occurred_at LIMIT 1;
  IF v_audit IS NULL THEN RAISE EXCEPTION 'Nenhum evento de auditoria disponível para o teste.'; END IF;
  v_blocked := false;
  BEGIN DELETE FROM ledger.audit_events WHERE id=v_audit; EXCEPTION WHEN sqlstate '55000' THEN v_blocked := true; END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Auditoria aceitou DELETE.'; END IF;

  SELECT id,timestamp INTO v_block,v_block_time FROM ledger.ledger_blocks ORDER BY timestamp LIMIT 1;
  v_blocked := false;
  BEGIN UPDATE ledger.ledger_blocks SET payload='{}' WHERE id=v_block AND timestamp=v_block_time; EXCEPTION WHEN sqlstate '55000' THEN v_blocked := true; END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Ledger aceitou UPDATE.'; END IF;

  RAISE NOTICE 'Imutabilidade aprovada: ledger, timeline e auditoria bloquearam mutações.';
END $$;
