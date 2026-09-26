-- ============================================================
-- VORTEX v4 — Refresh token com rotacao e deteccao de reuso
--
-- O access token (JWT HS256, 1h) e curto; o refresh token e um segredo opaco
-- de 32 bytes guardado apenas como SHA-256. Cada login abre uma FAMILIA de
-- tokens: a cada uso o token e trocado por um novo (rotacao) e o antigo fica
-- marcado como usado. Reapresentar um token ja usado significa vazamento —
-- entao a familia inteira e revogada.
--
-- O refresh acontece sem contexto de requisicao (o access token pode estar
-- vencido), por isso o acesso passa por funcoes SECURITY DEFINER, no mesmo
-- padrao de `identity.verify_password`. A tabela nao e acessivel pelo app.
-- ============================================================

CREATE TABLE identity.refresh_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  family_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  replaced_by uuid REFERENCES identity.refresh_tokens(id)
);

CREATE INDEX idx_refresh_family ON identity.refresh_tokens(family_id);
CREATE INDEX idx_refresh_user ON identity.refresh_tokens(user_id);

-- Sem politica alguma: o app nao le nem escreve a tabela diretamente.
ALTER TABLE identity.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.refresh_tokens FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------- funcoes ----

-- Abre uma familia no login: devolve o id do token emitido.
CREATE FUNCTION identity.issue_refresh_token(
  p_id uuid,
  p_user uuid,
  p_tenant uuid,
  p_company uuid,
  p_token_hash char(64),
  p_family uuid,
  p_ttl_seconds integer
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  INSERT INTO identity.refresh_tokens(id, user_id, tenant_id, company_id, family_id, token_hash, expires_at)
  VALUES (p_id, p_user, p_tenant, p_company, p_family, p_token_hash,
          clock_timestamp() + make_interval(secs => greatest(p_ttl_seconds, 60)))
  RETURNING id;
$$;

-- Troca um token valido por outro da mesma familia. Atomicamente: valida,
-- detecta reuso/expiracao e, se tudo certo, emite o sucessor e marca o antigo.
-- `p_result` diz ao app o que ocorreu: ROTATED, NOT_FOUND, EXPIRED ou REUSED.
CREATE FUNCTION identity.rotate_refresh_token(
  p_old_hash char(64),
  p_new_id uuid,
  p_new_hash char(64),
  p_ttl_seconds integer
)
RETURNS TABLE(result text, user_id uuid, tenant_id uuid, company_id uuid, family_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
DECLARE
  v_token identity.refresh_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token
    FROM identity.refresh_tokens
   WHERE token_hash = p_old_hash
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  -- Ja usado (ou revogado): reuso detectado. Derruba a familia inteira.
  IF v_token.used_at IS NOT NULL OR v_token.revoked_at IS NOT NULL THEN
    UPDATE identity.refresh_tokens t
       SET revoked_at = clock_timestamp()
     WHERE t.family_id = v_token.family_id AND t.revoked_at IS NULL;
    RETURN QUERY SELECT 'REUSED'::text, v_token.user_id, v_token.tenant_id,
                        v_token.company_id, v_token.family_id;
    RETURN;
  END IF;

  IF v_token.expires_at <= clock_timestamp() THEN
    UPDATE identity.refresh_tokens t
       SET revoked_at = clock_timestamp()
     WHERE t.id = v_token.id;
    RETURN QUERY SELECT 'EXPIRED'::text, v_token.user_id, v_token.tenant_id,
                        v_token.company_id, v_token.family_id;
    RETURN;
  END IF;

  INSERT INTO identity.refresh_tokens(id, user_id, tenant_id, company_id, family_id, token_hash, expires_at)
  VALUES (p_new_id, v_token.user_id, v_token.tenant_id, v_token.company_id, v_token.family_id, p_new_hash,
          clock_timestamp() + make_interval(secs => greatest(p_ttl_seconds, 60)));

  UPDATE identity.refresh_tokens t
     SET used_at = clock_timestamp(), replaced_by = p_new_id
   WHERE t.id = v_token.id;

  RETURN QUERY SELECT 'ROTATED'::text, v_token.user_id, v_token.tenant_id,
                      v_token.company_id, v_token.family_id;
END;
$$;

-- Encerra a sessao: revoga a familia do token apresentado (e devolve quantos).
CREATE FUNCTION identity.revoke_refresh_family(p_token_hash char(64))
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
DECLARE
  v_family uuid;
  v_count integer;
BEGIN
  SELECT family_id INTO v_family
    FROM identity.refresh_tokens
   WHERE token_hash = p_token_hash;
  IF v_family IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE identity.refresh_tokens
     SET revoked_at = clock_timestamp()
   WHERE family_id = v_family AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION identity.issue_refresh_token(uuid, uuid, uuid, uuid, char, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.rotate_refresh_token(char, uuid, char, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.revoke_refresh_family(char) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.issue_refresh_token(uuid, uuid, uuid, uuid, char, uuid, integer) TO vortex_app;
GRANT EXECUTE ON FUNCTION identity.rotate_refresh_token(char, uuid, char, integer) TO vortex_app;
GRANT EXECUTE ON FUNCTION identity.revoke_refresh_family(char) TO vortex_app;
