-- ============================================================
-- VORTEX v4 — Corrige `identity.rotate_refresh_token`
--
-- A versao original declarava `family_id` entre as colunas de retorno
-- (`RETURNS TABLE`), o que tornava a referencia nua `family_id` ambigua no
-- ramo de reuso e nas atualizacoes. Aqui a funcao e redefinida qualificando a
-- tabela alvo. A 0013 tambem ja sai corrigida para instalacoes novas.
-- ============================================================

CREATE OR REPLACE FUNCTION identity.rotate_refresh_token(
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

REVOKE ALL ON FUNCTION identity.rotate_refresh_token(char, uuid, char, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.rotate_refresh_token(char, uuid, char, integer) TO vortex_app;
