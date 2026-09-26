DO $$
DECLARE
  v_public_count bigint;
  v_restricted_leak bigint;
  v_rls_enabled boolean;
BEGIN
  SELECT count(*) INTO v_public_count FROM protocol.public_search(NULL, 100);
  SELECT count(*) INTO v_restricted_leak FROM protocol.public_search(NULL, 100) public_result
    JOIN protocol.protocols p ON p.protocol_number=public_result.protocol_number
    WHERE p.access_level <> 'PUBLIC' OR p.contains_personal_data;
  IF v_public_count < 1 THEN RAISE EXCEPTION 'A consulta pública não retornou o protocolo público de teste.'; END IF;
  IF v_restricted_leak <> 0 THEN RAISE EXCEPTION 'A consulta pública vazou protocolo restrito ou dado pessoal.'; END IF;

  SELECT bool_and(c.relrowsecurity AND c.relforcerowsecurity) INTO v_rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE (n.nspname,c.relname) IN (('protocol','protocols'),('protocol','timeline_events'),('protocol','protocol_views'),('ledger','audit_events'),('ledger','verification_runs'));
  IF v_rls_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS não está habilitado e forçado em todas as tabelas da Fase 2.'; END IF;
  RAISE NOTICE 'Acesso aprovado: pesquisa pública filtrada e RLS forçado.';
END $$;
