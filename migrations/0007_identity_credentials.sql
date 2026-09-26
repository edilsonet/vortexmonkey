-- ============================================================
-- VORTEX v4 — Credenciais de acesso (autenticacao)
-- Substitui o contexto por cabecalho de desenvolvimento por JWT assinado.
--
-- O login acontece ANTES de existir contexto e o RLS de `identity.*` exige
-- `identity.current_user_id()`. Por isso a verificacao de senha roda em funcao
-- SECURITY DEFINER (dona das tabelas), no mesmo padrao de
-- `identity.current_tenant_ids()`. O RLS continua valendo para as consultas de
-- dominio depois que o token fornece o contexto.
-- ============================================================

CREATE TABLE identity.credentials (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE identity.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.credentials FORCE ROW LEVEL SECURITY;

-- O proprio usuario pode ler/atualizar a propria credencial (troca de senha).
CREATE POLICY credentials_self_select ON identity.credentials
  FOR SELECT USING (user_id = identity.current_user_id());
CREATE POLICY credentials_self_update ON identity.credentials
  FOR UPDATE USING (user_id = identity.current_user_id())
  WITH CHECK (user_id = identity.current_user_id());

GRANT SELECT, UPDATE ON identity.credentials TO vortex_app;

-- ---------------------------------------------------------------- funcoes ----

-- Define/redefine a senha (bcrypt via pgcrypto). SECURITY DEFINER porque a
-- gestao de credencial tambem roda sem contexto de tenant.
CREATE FUNCTION identity.set_password(p_user uuid, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, public, pg_temp AS $$
BEGIN
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'a senha deve ter ao menos 8 caracteres' USING ERRCODE = '22023';
  END IF;
  INSERT INTO identity.credentials(user_id, password_hash)
  VALUES (p_user, crypt(p_password, gen_salt('bf', 12)))
  ON CONFLICT (user_id) DO UPDATE
    SET password_hash = excluded.password_hash,
        password_changed_at = now(),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();
END $$;

-- Verifica a senha e aplica a politica de bloqueio (5 falhas -> 15 min).
-- Nunca revela se o e-mail existe: devolve `ok = false` em qualquer falha.
CREATE FUNCTION identity.verify_password(p_email text, p_password text)
RETURNS TABLE (user_id uuid, ok boolean, locked boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, public, pg_temp AS $$
DECLARE
  v_user uuid;
  v_hash text;
  v_locked timestamptz;
BEGIN
  SELECT u.id, c.password_hash, c.locked_until
    INTO v_user, v_hash, v_locked
  FROM identity.users u
  JOIN identity.credentials c ON c.user_id = u.id
  WHERE u.email = p_email::citext AND u.is_active
  FOR UPDATE OF c;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, false;
    RETURN;
  END IF;

  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN QUERY SELECT v_user, false, true;
    RETURN;
  END IF;

  IF v_hash = crypt(p_password, v_hash) THEN
    UPDATE identity.credentials
       SET failed_attempts = 0, locked_until = NULL, updated_at = now()
     WHERE credentials.user_id = v_user;
    RETURN QUERY SELECT v_user, true, false;
  ELSE
    UPDATE identity.credentials
       SET failed_attempts = credentials.failed_attempts + 1,
           locked_until = CASE
             WHEN credentials.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
             ELSE NULL
           END,
           updated_at = now()
     WHERE credentials.user_id = v_user;
    RETURN QUERY SELECT v_user, false, false;
  END IF;
END $$;

-- Vinculos ATIVOS do usuario, para escolher tenant/empresa do token.
CREATE FUNCTION identity.memberships(p_user uuid)
RETURNS TABLE (tenant_id uuid, company_id uuid, role varchar, functional_position varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT r.tenant_id, r.company_id, r.role::varchar, r.functional_position::varchar
  FROM identity.relationships r
  JOIN identity.tenant_users tu
    ON tu.tenant_id = r.tenant_id AND tu.user_id = r.user_id AND tu.status = 'ACTIVE'
  WHERE r.user_id = p_user
    AND r.status = 'ACTIVE'
    AND (r.starts_at IS NULL OR r.starts_at <= now())
    AND (r.expires_at IS NULL OR r.expires_at > now())
  ORDER BY r.created_at
$$;

REVOKE ALL ON FUNCTION identity.set_password(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.verify_password(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.memberships(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.set_password(uuid, text) TO vortex_app;
GRANT EXECUTE ON FUNCTION identity.verify_password(text, text) TO vortex_app;
GRANT EXECUTE ON FUNCTION identity.memberships(uuid) TO vortex_app;
