ALTER TABLE identity.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.ledger_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol.protocols ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION identity.current_person_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.person_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION identity.current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE POLICY people_self_or_tenant ON identity.people
  USING (
    id = identity.current_person_id()
    OR tenant_id = identity.current_tenant_id()
  );

CREATE POLICY companies_tenant ON identity.companies
  USING (tenant_id = identity.current_tenant_id());

CREATE POLICY relationships_tenant ON identity.relationships
  USING (tenant_id = identity.current_tenant_id() OR person_id = identity.current_person_id());

CREATE POLICY members_tenant ON identity.tenant_members
  USING (tenant_id = identity.current_tenant_id() OR person_id = identity.current_person_id());

CREATE POLICY profiles_owner ON professional.profiles
  USING (person_id = identity.current_person_id());

CREATE POLICY holdings_tenant ON stock.holdings
  USING (tenant_id = identity.current_tenant_id());

CREATE POLICY items_via_holding ON stock.items
  USING (holding_id IN (SELECT id FROM stock.holdings WHERE tenant_id = identity.current_tenant_id()));

CREATE POLICY vacancies_tenant ON recruitment.vacancies
  USING (tenant_id = identity.current_tenant_id());

CREATE POLICY applications_visible ON recruitment.applications
  USING (person_id = identity.current_person_id() OR vacancy_id IN (
    SELECT id FROM recruitment.vacancies WHERE tenant_id = identity.current_tenant_id()
  ));

CREATE POLICY ledger_tenant ON ledger.ledger_blocks
  USING (tenant_id = identity.current_tenant_id() OR actor_person_id = identity.current_person_id());

CREATE POLICY protocol_tenant ON protocol.protocols
  USING (tenant_id = identity.current_tenant_id() OR actor_person_id = identity.current_person_id());
