-- ============================================================
-- VORTEX v4 — Listagem de sessoes ativas por dispositivo
--
-- Fecha a lacuna 21.3.1: o usuario passa a ver as sessoes ativas (familia de
-- refresh tokens) e encerrar uma so, sem derrubar as demais.
--
-- Para identificar o dispositivo, a familia guarda o `user_agent` e o `ip` do
-- login que a abriu (a rotacao mantem a mesma familia, entao o dado nao se
-- perde). `identity.list_user_sessions` devolve uma linha por familia VIVA
-- (sem token revogado e com token nao expirado), sempre agregando por familia.
--
-- A leitura passa por funcao SECURITY DEFINER (a tabela tem RLS forçado sem
-- politica e o app so a toca por funcao), no mesmo padrao da secao 18.
-- ============================================================

ALTER TABLE identity.refresh_tokens
  ADD COLUMN user_agent varchar(300),
  ADD COLUMN ip_address inet;

-- A emissao passa a registrar o dispositivo. O papel antigo (7 args) e
-- substituido; o app sempre chama a versao nova.
DROP FUNCTION identity.issue_refresh_token(uuid, uuid, uuid, uuid, char, uuid, integer);

CREATE FUNCTION identity.issue_refresh_token(
  p_id uuid,
  p_user uuid,
  p_tenant uuid,
  p_company uuid,
  p_token_hash char(64),
  p_family uuid,
  p_ttl_seconds integer,
  p_user_agent text,
  p_ip inet
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  INSERT INTO identity.refresh_tokens(
    id, user_id, tenant_id, company_id, family_id, token_hash, expires_at, user_agent, ip_address
  )
  VALUES (p_id, p_user, p_tenant, p_company, p_family, p_token_hash,
          clock_timestamp() + make_interval(secs => greatest(p_ttl_seconds, 60)),
          left(nullif(p_user_agent, ''), 300), p_ip)
  RETURNING id;
$$;

REVOKE ALL ON FUNCTION identity.issue_refresh_token(uuid, uuid, uuid, uuid, char, uuid, integer, text, inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.issue_refresh_token(uuid, uuid, uuid, uuid, char, uuid, integer, text, inet) TO vortex_app;

-- Sessoes vivas do usuario: uma familia por linha, com o dispositivo da
-- primeira emissao (o login) e a ultima atividade.
CREATE FUNCTION identity.list_user_sessions(p_user_id uuid)
RETURNS TABLE (
  family_id uuid,
  tenant_id uuid,
  company_id uuid,
  user_agent varchar,
  ip_address inet,
  created_at timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT t.family_id,
         (array_agg(t.tenant_id ORDER BY t.issued_at))[1],
         (array_agg(t.company_id ORDER BY t.issued_at))[1],
         (array_agg(t.user_agent ORDER BY t.issued_at))[1],
         (array_agg(t.ip_address ORDER BY t.issued_at))[1],
         min(t.issued_at),
         max(t.used_at),
         max(t.expires_at)
    FROM identity.refresh_tokens t
   WHERE t.user_id = p_user_id
   GROUP BY t.family_id
  HAVING bool_or(t.revoked_at IS NULL AND t.expires_at > clock_timestamp())
   ORDER BY max(coalesce(t.used_at, t.issued_at)) DESC
$$;

REVOKE ALL ON FUNCTION identity.list_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.list_user_sessions(uuid) TO vortex_app;

-- Encerra UMA familia do proprio usuario (o `user_id` no WHERE impede que um
-- usuario revogue a sessao de outro, mesmo conhecendo o `family_id`).
CREATE FUNCTION identity.revoke_user_session(
  p_user_id uuid,
  p_family_id uuid,
  p_reason varchar
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
     AND family_id = p_family_id
     AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION identity.revoke_user_session(uuid, uuid, varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.revoke_user_session(uuid, uuid, varchar) TO vortex_app;
