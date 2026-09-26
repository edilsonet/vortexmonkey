CREATE OR REPLACE FUNCTION oauth.rotate_refresh_token(p_old_hash varchar, p_new_id uuid, p_new_hash varchar, p_expires_at timestamptz)
RETURNS TABLE(user_id uuid, memberships jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = oauth, identity, pg_temp AS $$
DECLARE
  current_token oauth.refresh_tokens%ROWTYPE;
BEGIN
  SELECT * INTO current_token FROM oauth.refresh_tokens
  WHERE token_hash = p_old_hash AND revoked_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO oauth.refresh_tokens(id, user_id, family_id, token_hash, expires_at)
  VALUES (p_new_id, current_token.user_id, current_token.family_id, p_new_hash, p_expires_at);
  UPDATE oauth.refresh_tokens SET revoked_at = now(), replaced_by = p_new_id WHERE id = current_token.id;
  RETURN QUERY SELECT current_token.user_id, oauth.memberships_for_user(current_token.user_id);
END;
$$;
