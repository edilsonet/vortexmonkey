CREATE TABLE oauth.credentials (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id),
  password_hash varchar(128) NOT NULL,
  salt varchar(64) NOT NULL,
  algorithm varchar(30) NOT NULL DEFAULT 'scrypt-v1' CHECK (algorithm = 'scrypt-v1'),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);

CREATE TABLE oauth.refresh_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id),
  family_id uuid NOT NULL,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by uuid REFERENCES oauth.refresh_tokens(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON oauth.refresh_tokens(user_id, expires_at DESC);

CREATE FUNCTION oauth.memberships_for_user(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tenantId', memberships.tenant_id,
    'roles', memberships.roles,
    'companyIds', memberships.company_ids
  )), '[]'::jsonb)
  FROM (
    SELECT tenant_user.tenant_id,
      array_agg(DISTINCT tenant_user.role) AS roles,
      COALESCE((
        SELECT array_agg(DISTINCT relationship.company_id)
        FROM identity.relationships relationship
        WHERE relationship.user_id = p_user_id
          AND relationship.tenant_id = tenant_user.tenant_id
          AND relationship.status = 'ACTIVE'
          AND (relationship.starts_at IS NULL OR relationship.starts_at <= now())
          AND (relationship.expires_at IS NULL OR relationship.expires_at > now())
      ), '{}'::uuid[]) AS company_ids
    FROM identity.tenant_users tenant_user
    WHERE tenant_user.user_id = p_user_id AND tenant_user.status = 'ACTIVE'
    GROUP BY tenant_user.tenant_id
  ) memberships
$$;

CREATE FUNCTION oauth.find_login(p_email text)
RETURNS TABLE(user_id uuid, password_hash varchar, salt varchar, locked_until timestamptz, memberships jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, oauth, pg_temp AS $$
  SELECT users.id, credentials.password_hash, credentials.salt, credentials.locked_until,
    oauth.memberships_for_user(users.id)
  FROM identity.users users
  JOIN oauth.credentials credentials ON credentials.user_id = users.id
  WHERE users.email = p_email AND users.is_active = true
$$;

CREATE FUNCTION oauth.store_refresh_token(p_id uuid, p_user_id uuid, p_family_id uuid, p_token_hash varchar, p_expires_at timestamptz)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = oauth, pg_temp AS $$
  INSERT INTO oauth.refresh_tokens(id, user_id, family_id, token_hash, expires_at)
  VALUES (p_id, p_user_id, p_family_id, p_token_hash, p_expires_at)
$$;

CREATE FUNCTION oauth.rotate_refresh_token(p_old_hash varchar, p_new_id uuid, p_new_hash varchar, p_expires_at timestamptz)
RETURNS TABLE(user_id uuid, memberships jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = oauth, identity, pg_temp AS $$
DECLARE
  current_token oauth.refresh_tokens%ROWTYPE;
BEGIN
  SELECT * INTO current_token FROM oauth.refresh_tokens
  WHERE token_hash = p_old_hash AND revoked_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE oauth.refresh_tokens SET revoked_at = now(), replaced_by = p_new_id WHERE id = current_token.id;
  INSERT INTO oauth.refresh_tokens(id, user_id, family_id, token_hash, expires_at)
  VALUES (p_new_id, current_token.user_id, current_token.family_id, p_new_hash, p_expires_at);
  RETURN QUERY SELECT current_token.user_id, oauth.memberships_for_user(current_token.user_id);
END;
$$;

CREATE FUNCTION oauth.revoke_refresh_token(p_token_hash varchar)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = oauth, pg_temp AS $$
  UPDATE oauth.refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
  WHERE token_hash = p_token_hash RETURNING true
$$;

CREATE FUNCTION oauth.record_login_result(p_user_id uuid, p_success boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = oauth, pg_temp AS $$
  UPDATE oauth.credentials SET
    failed_attempts = CASE WHEN p_success THEN 0 ELSE failed_attempts + 1 END,
    locked_until = CASE
      WHEN p_success THEN NULL
      WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
      ELSE locked_until
    END
  WHERE user_id = p_user_id
$$;

REVOKE ALL ON FUNCTION oauth.memberships_for_user(uuid), oauth.find_login(text), oauth.store_refresh_token(uuid,uuid,uuid,varchar,timestamptz), oauth.rotate_refresh_token(varchar,uuid,varchar,timestamptz), oauth.revoke_refresh_token(varchar), oauth.record_login_result(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION oauth.memberships_for_user(uuid), oauth.find_login(text), oauth.store_refresh_token(uuid,uuid,uuid,varchar,timestamptz), oauth.rotate_refresh_token(varchar,uuid,varchar,timestamptz), oauth.revoke_refresh_token(varchar), oauth.record_login_result(uuid,boolean) TO vortex_app;
REVOKE ALL ON oauth.credentials, oauth.refresh_tokens FROM PUBLIC, vortex_app;
