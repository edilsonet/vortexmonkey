CREATE TABLE oauth.credentials (
  person_id uuid PRIMARY KEY REFERENCES identity.people(id),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oauth.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  family_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oauth.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES identity.people(id),
  tenant_id uuid REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  ip inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
