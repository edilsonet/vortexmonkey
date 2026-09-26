BEGIN;
INSERT INTO identity.users(id, cpf, full_name, email)
VALUES ('30000000-0000-4000-8000-000000000001', '16899535009', 'Teste MDM', 'teste-mdm@example.test');
INSERT INTO identity.professional_profiles(id, user_id, professional_type)
VALUES ('30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'PILOTO');

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO identity.professional_profiles(id, user_id, professional_type)
    VALUES ('30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'MMA');
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Falha: uma pessoa recebeu dois perfis canônicos.'; END IF;
  RAISE NOTICE 'MDM aprovado: uma pessoa possui somente um perfil canônico.';
END $$;

INSERT INTO identity.licenses(id, profile_id, license_type, license_number, issue_date, valid_until)
VALUES ('30000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'PC', 'CANAC-E2E', '2026-01-01', '2027-01-01');

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO identity.licenses(id, profile_id, license_type, license_number, issue_date, valid_until)
    VALUES ('30000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'PC', 'CANAC-E2E', '2026-01-01', '2027-01-01');
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Falha: licença canônica duplicada.'; END IF;
  RAISE NOTICE 'MDM aprovado: licença canônica duplicada foi bloqueada.';
END $$;
ROLLBACK;
