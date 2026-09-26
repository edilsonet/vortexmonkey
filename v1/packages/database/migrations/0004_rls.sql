CREATE FUNCTION identity.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE FUNCTION identity.current_tenant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT tenant_id FROM identity.tenant_users
  WHERE user_id = identity.current_user_id() AND status = 'ACTIVE'
$$;

CREATE FUNCTION identity.current_company_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT company_id FROM identity.relationships
  WHERE user_id = identity.current_user_id()
    AND status = 'ACTIVE'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
$$;

REVOKE ALL ON FUNCTION identity.current_user_id(), identity.current_tenant_ids(), identity.current_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.current_user_id(), identity.current_tenant_ids(), identity.current_company_ids() TO vortex_app;

ALTER TABLE identity.tenants ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.users FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.companies ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.tenant_users ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.tenant_companies ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.tenant_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.relationships ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.proxies ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.proxies FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.professional_profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.professional_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.licenses ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.licenses FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.accreditations ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.accreditations FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger.ledger_blocks ENABLE ROW LEVEL SECURITY; ALTER TABLE ledger.ledger_blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE ledger.outbox_events ENABLE ROW LEVEL SECURITY; ALTER TABLE ledger.outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_member_select ON identity.tenants FOR SELECT USING (id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY users_self_or_company_select ON identity.users FOR SELECT USING (
  id = identity.current_user_id() OR id IN (
    SELECT r.user_id FROM identity.relationships r WHERE r.company_id IN (SELECT identity.current_company_ids()) AND r.status = 'ACTIVE'
  )
);
CREATE POLICY users_self_update ON identity.users FOR UPDATE USING (id = identity.current_user_id()) WITH CHECK (id = identity.current_user_id());
CREATE POLICY companies_member_select ON identity.companies FOR SELECT USING (id IN (SELECT identity.current_company_ids()));
CREATE POLICY tenant_users_member_select ON identity.tenant_users FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tenant_companies_member_select ON identity.tenant_companies FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY relationships_member_select ON identity.relationships FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY relationships_member_insert ON identity.relationships FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND created_by = identity.current_user_id());
CREATE POLICY proxies_company_select ON identity.proxies FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()) AND company_id IN (SELECT identity.current_company_ids()));
CREATE POLICY profiles_visible ON identity.professional_profiles FOR SELECT USING (user_id = identity.current_user_id() OR user_id IN (SELECT r.user_id FROM identity.relationships r WHERE r.company_id IN (SELECT identity.current_company_ids())));
CREATE POLICY licenses_visible ON identity.licenses FOR SELECT USING (profile_id IN (SELECT p.id FROM identity.professional_profiles p));
CREATE POLICY accreditations_visible ON identity.accreditations FOR SELECT USING (user_id = identity.current_user_id() OR user_id IN (SELECT r.user_id FROM identity.relationships r WHERE r.company_id IN (SELECT identity.current_company_ids())));
CREATE POLICY ledger_tenant_select ON ledger.ledger_blocks FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ledger_tenant_insert ON ledger.ledger_blocks FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND created_by = identity.current_user_id());
CREATE POLICY outbox_tenant_select ON ledger.outbox_events FOR SELECT USING (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY outbox_tenant_insert ON ledger.outbox_events FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()) AND user_id = identity.current_user_id());

GRANT SELECT, INSERT, UPDATE ON identity.tenants, identity.users, identity.companies, identity.tenant_users, identity.tenant_companies, identity.relationships, identity.proxies, identity.professional_profiles, identity.licenses, identity.accreditations TO vortex_app;
GRANT SELECT, INSERT ON ledger.ledger_blocks TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON ledger.outbox_events TO vortex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity, ledger TO vortex_app;

CREATE POLICY profiles_self_insert ON identity.professional_profiles FOR INSERT WITH CHECK (user_id = identity.current_user_id());
CREATE POLICY licenses_self_insert ON identity.licenses FOR INSERT WITH CHECK (profile_id IN (SELECT p.id FROM identity.professional_profiles p WHERE p.user_id = identity.current_user_id()));
CREATE POLICY accreditations_self_insert ON identity.accreditations FOR INSERT WITH CHECK (user_id = identity.current_user_id());
