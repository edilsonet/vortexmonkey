CREATE TABLE identity.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf varchar(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  full_name varchar(255) NOT NULL,
  social_name varchar(255),
  email citext NOT NULL UNIQUE,
  phone varchar(20),
  canac varchar(10) UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  tenant_id uuid REFERENCES identity.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj varchar(14) NOT NULL UNIQUE CHECK (cnpj ~ '^[0-9]{14}$'),
  corporate_name varchar(255) NOT NULL,
  trade_name varchar(255),
  certificate_type varchar(50),
  certificate_number varchar(100),
  operational_status varchar(50) NOT NULL DEFAULT 'ATIVO',
  tenant_id uuid REFERENCES identity.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.tenant_members (
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  role varchar(50) NOT NULL CHECK (role IN (
    'VISITANTE','RCONTA','CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR','PROPRIETARIO_OPERADOR','FUNCIONARIO'
  )),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
  PRIMARY KEY (tenant_id, person_id)
);

CREATE TABLE identity.relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  role varchar(50) NOT NULL CHECK (role IN (
    'CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR','PROPRIETARIO_OPERADOR','FUNCIONARIO'
  )),
  person_confirmed boolean NOT NULL DEFAULT false,
  company_confirmed boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
  created_by uuid NOT NULL REFERENCES identity.people(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, person_id, company_id, role)
);

CREATE TABLE identity.field_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES identity.people(id),
  company_id uuid REFERENCES identity.companies(id),
  field_name varchar(80) NOT NULL,
  level varchar(2) NOT NULL CHECK (level IN ('N0','N1','N2','N3')),
  source varchar(80),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  kind varchar(30) NOT NULL CHECK (kind IN ('EMAIL','PHONE','ADDRESS')),
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER people_updated BEFORE UPDATE ON identity.people
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER companies_updated BEFORE UPDATE ON identity.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER relationships_updated BEFORE UPDATE ON identity.relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
