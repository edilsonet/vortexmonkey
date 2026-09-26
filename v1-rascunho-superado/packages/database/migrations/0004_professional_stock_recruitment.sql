CREATE TABLE professional.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL UNIQUE REFERENCES identity.people(id),
  professional_type varchar(50) NOT NULL CHECK (professional_type IN (
    'PILOTO','COMISSARIO','MECANICO_VOO','MMA','DOV','INSTRUTOR','EXAMINADOR','OUTRO'
  )),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','INACTIVE')),
  summary text,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE professional.civ_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES professional.profiles(id),
  civ_number varchar(40) NOT NULL,
  hours_total numeric(10,1) NOT NULL DEFAULT 0,
  issued_at date,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, civ_number)
);

CREATE TABLE professional.cma_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES professional.profiles(id),
  cma_class varchar(10) NOT NULL,
  valid_until date NOT NULL,
  clinic_name varchar(255),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE professional.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES professional.profiles(id),
  company_name varchar(255) NOT NULL,
  role_title varchar(120) NOT NULL,
  started_at date NOT NULL,
  ended_at date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE professional.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES professional.profiles(id),
  title varchar(255) NOT NULL,
  issuer varchar(255) NOT NULL,
  issued_at date NOT NULL,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  kind varchar(20) NOT NULL CHECK (kind IN ('PERSONAL','COMPANY','ERP')),
  owner_person_id uuid REFERENCES identity.people(id),
  owner_company_id uuid REFERENCES identity.companies(id),
  origin_mark varchar(40) NOT NULL CHECK (origin_mark IN (
    'PERSONAL','COMPANY','ERP_MRO','ERP_OPS','ERP_TRAINING','ERP_AIRPORT'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'PERSONAL' AND owner_person_id IS NOT NULL AND owner_company_id IS NULL) OR
    (kind = 'COMPANY' AND owner_company_id IS NOT NULL) OR
    (kind = 'ERP' AND owner_company_id IS NOT NULL)
  )
);

CREATE TABLE stock.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id uuid NOT NULL REFERENCES stock.holdings(id),
  sku varchar(80) NOT NULL,
  name varchar(255) NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  origin_mark varchar(40) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','SOLD','QUARANTINE')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recruitment.vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  title varchar(255) NOT NULL,
  source_app varchar(40) NOT NULL DEFAULT 'RCONTA',
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','PAUSED')),
  created_by uuid NOT NULL REFERENCES identity.people(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recruitment.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES recruitment.vacancies(id),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  status varchar(20) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','IN_REVIEW','HIRED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, person_id)
);
