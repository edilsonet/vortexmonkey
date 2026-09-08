ALTER TABLE identity.people
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS professional_email citext,
  ADD COLUMN IF NOT EXISTS professional_phone varchar(20);

CREATE TABLE IF NOT EXISTS identity.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  kind varchar(30) NOT NULL CHECK (kind IN ('PERSONAL','PROFESSIONAL','COMPANY')),
  street varchar(255) NOT NULL,
  number varchar(30),
  neighborhood varchar(120),
  city varchar(120) NOT NULL,
  state varchar(80) NOT NULL,
  country varchar(80) NOT NULL DEFAULT 'Brasil',
  cep varchar(8) NOT NULL CHECK (cep ~ '^[0-9]{8}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (person_id IS NOT NULL OR company_id IS NOT NULL)
);

ALTER TABLE identity.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE identity.tenant_members ADD CONSTRAINT tenant_members_role_check CHECK (role IN (
  'VISITANTE','RCONTA','CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR',
  'PROPRIETARIO_OPERADOR','FUNCIONARIO','RESPONSAVEL_TECNICO'
));

ALTER TABLE identity.relationships DROP CONSTRAINT IF EXISTS relationships_role_check;
ALTER TABLE identity.relationships ADD CONSTRAINT relationships_role_check CHECK (role IN (
  'CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR',
  'PROPRIETARIO_OPERADOR','FUNCIONARIO','RESPONSAVEL_TECNICO'
));

ALTER TABLE identity.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.addresses FORCE ROW LEVEL SECURITY;

CREATE POLICY addresses_visible ON identity.addresses
  USING (
    person_id = identity.current_person_id()
    OR company_id IN (SELECT id FROM identity.companies WHERE tenant_id = identity.current_tenant_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON identity.addresses TO vortex_app;
