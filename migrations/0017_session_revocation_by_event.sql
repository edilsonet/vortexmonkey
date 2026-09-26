-- ============================================================
-- VORTEX v4 — Revogacao de sessoes por evento
--
-- Fecha a lacuna 18.3.2: ate aqui as familias de refresh token so morriam no
-- `logout` ou no reuso detectado. Trocar a senha (ou perder o vinculo ATIVO)
-- deixava sessoes antigas vivas. Agora:
--
--   * trocar a senha encerra TODAS as sessoes do usuario (qualquer tenant);
--   * perder um vinculo ACTIVE encerra as sessoes DAQUELE tenant;
--   * o usuario pode encerrar todas as sessoes sob demanda (logout-all).
--
-- O gancho e de banco (triggers em `identity.credentials` e nos vinculos), nao
-- de aplicacao: qualquer caminho que troque a senha — `set_password` do seed,
-- reset administrativo ou troca pelo proprio usuario — revoga. `revoked_reason`
-- guarda POR QUE a familia caiu, sem expor o token.
--
-- DESVIO CONSCIENTE DA REGRA 1: a revogacao e estado de seguranca interno da
-- autenticacao (a mesma natureza de `used_at`/`replaced_by`), como o `logout`
-- da secao 18, e por isso NAO gera bloco no ledger.
-- ============================================================

ALTER TABLE identity.refresh_tokens
  ADD COLUMN revoked_reason varchar(40);

-- Revoga as familias vivas do usuario. Sem `p_tenant`, alcanca todos os
-- tenants (troca de senha / logout-all); com `p_tenant`, so aquele vinculo.
CREATE FUNCTION identity.revoke_user_sessions(
  p_user_id uuid,
  p_reason varchar,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE identity.refresh_tokens
     SET revoked_at = clock_timestamp(),
         revoked_reason = p_reason
   WHERE user_id = p_user_id
     AND revoked_at IS NULL
     AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION identity.revoke_user_sessions(uuid, varchar, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.revoke_user_sessions(uuid, varchar, uuid) TO vortex_app;

-- Reafirma a troca de senha do proprio usuario (nova senha nao vem do banco).
CREATE FUNCTION identity.verify_user_password(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, public, pg_temp AS $$
  SELECT coalesce(
    (SELECT c.password_hash = crypt(p_password, c.password_hash)
       FROM identity.credentials c
      WHERE c.user_id = p_user_id),
    false
  )
$$;

REVOKE ALL ON FUNCTION identity.verify_user_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.verify_user_password(uuid, text) TO vortex_app;

-- ------------------------------------------------------- ganchos de evento ---

-- Trocar a senha encerra todas as sessoes do usuario.
CREATE FUNCTION identity.on_password_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
BEGIN
  PERFORM identity.revoke_user_sessions(NEW.user_id, 'PASSWORD_CHANGED', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credentials_password_changed
AFTER UPDATE OF password_hash ON identity.credentials
FOR EACH ROW WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
EXECUTE FUNCTION identity.on_password_changed();

-- Perder o vinculo ATIVO de um tenant encerra as sessoes daquele tenant.
CREATE FUNCTION identity.on_membership_revoked() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
BEGIN
  IF OLD.status = 'ACTIVE' AND NEW.status <> 'ACTIVE' THEN
    PERFORM identity.revoke_user_sessions(NEW.user_id, 'MEMBERSHIP_REVOKED', NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_users_membership_revoked
AFTER UPDATE ON identity.tenant_users
FOR EACH ROW EXECUTE FUNCTION identity.on_membership_revoked();

CREATE TRIGGER trg_relationships_membership_revoked
AFTER UPDATE ON identity.relationships
FOR EACH ROW EXECUTE FUNCTION identity.on_membership_revoked();

-- --------------------------------------------------- rotulos de revogacao ---

-- Distingue, no registro, a saida normal do reuso detectado e da expiracao.
CREATE OR REPLACE FUNCTION identity.revoke_refresh_family(p_token_hash char(64))
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
     SET revoked_at = clock_timestamp(),
         revoked_reason = coalesce(revoked_reason, 'LOGOUT')
   WHERE family_id = v_family AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

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

  -- Ja usado (ou revogado): reuso detectado. Derruba a familia inteira.
  IF v_token.used_at IS NOT NULL OR v_token.revoked_at IS NOT NULL THEN
    UPDATE identity.refresh_tokens t
       SET revoked_at = clock_timestamp(),
           revoked_reason = coalesce(t.revoked_reason, 'REUSE_DETECTED')
     WHERE t.family_id = v_token.family_id AND t.revoked_at IS NULL;
    RETURN QUERY SELECT 'REUSED'::text, v_token.user_id, v_token.tenant_id,
                        v_token.company_id, v_token.family_id;
    RETURN;
  END IF;

  IF v_token.expires_at <= clock_timestamp() THEN
    UPDATE identity.refresh_tokens t
       SET revoked_at = clock_timestamp(),
           revoked_reason = 'EXPIRED'
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
