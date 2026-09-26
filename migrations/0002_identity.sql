-- ============================================================
-- VORTEX v4 — Identidade (núcleo dono da verdade)
-- Fonte: árvore v1, migração 0002.
-- LACUNA CONHECIDA: os enums de papel abaixo usam o vocabulário da v1. O RBAC
-- do v4 (ADMIN/LEGAL/PROCURADOR/FUNCIONARIO/USER + posições funcionais) deve
-- ser reconciliado quando o Cadastro Central for construído.
-- ============================================================

CREATE TABLE identity.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  type varchar(50) NOT NULL CHECK (type IN ('ERP','RH','CRM','LOJA','OPERADORES','MANUTENCAO','INSTRUCAO')),
  status varchar(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf varchar(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  full_name varchar(255) NOT NULL,
  social_name varchar(255),
  email citext NOT NULL UNIQUE,
  phone varchar(20),
  canac varchar(10) UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
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
  certificate_validity timestamptz,
  operational_status varchar(50) NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.tenant_users (
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  role varchar(50) NOT NULL CHECK (role IN ('VISITANTE','RCONTA','CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR','PROPRIETARIO_OPERADOR','FUNCIONARIO')),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE identity.tenant_companies (
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  PRIMARY KEY (tenant_id, company_id)
);

CREATE TABLE identity.relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  role varchar(50) NOT NULL CHECK (role IN ('CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR','PROPRIETARIO_OPERADOR','FUNCIONARIO')),
  functional_position varchar(80),
  scoped_modules text[] NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, company_id, role)
);

CREATE TABLE identity.proxies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid NOT NULL REFERENCES identity.companies(id),
  grantor_user_id uuid NOT NULL REFERENCES identity.users(id),
  grantee_user_id uuid NOT NULL REFERENCES identity.users(id),
  scoped_modules text[] NOT NULL,
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at),
  CHECK (grantor_user_id <> grantee_user_id)
);

CREATE TABLE identity.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES identity.users(id),
  professional_type varchar(50) NOT NULL CHECK (professional_type IN ('PILOTO','COMISSARIO','MECANICO_VOO','MMA','DOV','INSTRUTOR','EXAMINADOR','OUTRO')),
  status varchar(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','INACTIVE')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES identity.professional_profiles(id),
  license_type varchar(50) NOT NULL CHECK (license_type IN ('PP','PC','PLA','MMA','DOV','COMISSARIO','MECANICO_VOO')),
  license_number varchar(50) NOT NULL,
  ratings text[] NOT NULL DEFAULT '{}',
  issue_date date NOT NULL,
  valid_until date NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED','REVOKED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, license_type, license_number),
  CHECK (valid_until >= issue_date)
);

CREATE TABLE identity.accreditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  accreditation_type varchar(50) NOT NULL CHECK (accreditation_type IN ('PCP','PCF','PCA','EXAMINADOR_MMA','SDEA_PROVISORIO')),
  portaria_number varchar(100) NOT NULL,
  issue_date date NOT NULL,
  scope text[] NOT NULL DEFAULT '{}',
  valid_until date NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED','REVOKED')),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, accreditation_type, portaria_number),
  CHECK (valid_until >= issue_date)
);

CREATE INDEX idx_relationships_user_active ON identity.relationships(user_id, tenant_id, company_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_licenses_validity ON identity.licenses(valid_until) WHERE status = 'ACTIVE';
CREATE INDEX idx_accreditations_validity ON identity.accreditations(valid_until) WHERE status = 'ACTIVE';
