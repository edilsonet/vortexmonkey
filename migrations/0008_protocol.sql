-- ============================================================
-- VORTEX v4 — Protocolo eletronico `AAAA-NNNNNN`
-- Resolucao ANAC n. 520/2019. O numero e sequencial por ano.
--
-- O contador e global (nao pertence a tenant) e so e tocado pela funcao
-- SECURITY DEFINER `protocol.next_number`; a tabela de protocolos tem RLS por
-- tenant e empresa como as demais tabelas operacionais.
-- ============================================================

CREATE TABLE protocol.protocol_counters (
  protocol_year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

CREATE TABLE protocol.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number varchar(11) NOT NULL UNIQUE CHECK (protocol_number ~ '^[0-9]{4}-[0-9]{6}$'),
  protocol_year integer NOT NULL,
  sequence_number integer NOT NULL,
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_year, sequence_number)
);

CREATE INDEX idx_protocols_entity ON protocol.protocols(entity_type, entity_id);
CREATE INDEX idx_protocols_tenant ON protocol.protocols(tenant_id, created_at DESC);

ALTER TABLE protocol.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol.protocols FORCE ROW LEVEL SECURITY;

CREATE POLICY protocols_tenant_select ON protocol.protocols FOR SELECT
  USING (
    tenant_id IN (SELECT identity.current_tenant_ids())
    AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  );
CREATE POLICY protocols_tenant_insert ON protocol.protocols FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT identity.current_tenant_ids())
    AND created_by = identity.current_user_id()
  );

GRANT SELECT, INSERT ON protocol.protocols TO vortex_app;

-- Gera o proximo numero do ano de forma atomica. `vortex_app` nao recebe acesso
-- direto a `protocol_counters`: apenas EXECUTE nesta funcao.
CREATE FUNCTION protocol.next_number(p_year integer)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = protocol, pg_temp AS $$
  INSERT INTO protocol.protocol_counters(protocol_year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (protocol_year)
    DO UPDATE SET last_number = protocol.protocol_counters.last_number + 1
  RETURNING last_number
$$;

REVOKE ALL ON FUNCTION protocol.next_number(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION protocol.next_number(integer) TO vortex_app;
