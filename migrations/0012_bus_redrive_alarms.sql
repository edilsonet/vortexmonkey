-- ============================================================
-- VORTEX v4 — Re-drive de eventos abandonados e alarmes do bus
--
-- Fecha as lacunas 16.3.1 e 16.3.3.
--
-- RE-DRIVE: o evento abandonado NAO e apagado (o bloco do ledger continua
-- integro); um administrador do proprio tenant pode devolve-lo a fila. A acao
-- e auditada no ledger (entity `ledger.outbox_events`, acao OUTBOX_REDRIVEN).
-- O escopo e o tenant do contexto: ninguem alcanca a fila de outro.
--
-- ALARMES: `notifications.bus_alarms` guarda o estado CORRENTE do monitor
-- (um alarme aberto por `code`), sem dado de tenant. O monitor sincroniza:
-- o que passou dos limiares abre/atualiza, o que normalizou e resolvido.
-- ============================================================

-- Autorizacao: o re-drive exige papel de administracao no tenant do contexto.
CREATE FUNCTION identity.can_administer(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = identity, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
      FROM identity.relationships r
      JOIN identity.tenant_users tu
        ON tu.tenant_id = r.tenant_id AND tu.user_id = r.user_id AND tu.status = 'ACTIVE'
     WHERE r.user_id = p_user_id
       AND r.tenant_id = p_tenant_id
       AND r.status = 'ACTIVE'
       AND r.role IN ('ADMIN', 'CRIADOR_EMPRESA')
       AND (r.starts_at IS NULL OR r.starts_at <= now())
       AND (r.expires_at IS NULL OR r.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION identity.can_administer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.can_administer(uuid, uuid) TO vortex_app;

-- Devolve a fila os eventos abandonados do tenant. Reinicia tentativas e
-- backoff para que o worker os pegue no proximo ciclo.
CREATE FUNCTION ledger.redrive_abandoned_outbox_events(
  p_tenant_id uuid,
  p_limit integer,
  p_ids uuid[] DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(id), '{}')
    INTO v_ids
    FROM (
      SELECT id
        FROM ledger.outbox_events
       WHERE tenant_id = p_tenant_id
         AND published_at IS NULL
         AND abandoned_at IS NOT NULL
         AND (p_ids IS NULL OR id = ANY (p_ids))
       ORDER BY occurred_at
       LIMIT greatest(p_limit, 0)
       FOR UPDATE SKIP LOCKED
    ) targets;

  IF array_length(v_ids, 1) IS NULL THEN
    RETURN '{}'::uuid[];
  END IF;

  UPDATE ledger.outbox_events
     SET abandoned_at = NULL,
         attempts = 0,
         next_attempt_at = NULL,
         last_error = NULL
   WHERE id = ANY (v_ids);

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION ledger.redrive_abandoned_outbox_events(uuid, integer, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ledger.redrive_abandoned_outbox_events(uuid, integer, uuid[]) TO vortex_app;

-- ---------------------------------------------------------------------------
-- Alarmes do bus (estado corrente, sem dado de tenant)
-- ---------------------------------------------------------------------------

CREATE TABLE notifications.bus_alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  severity varchar(16) NOT NULL,
  message text NOT NULL,
  context jsonb,
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz,
  CONSTRAINT bus_alarms_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'BLOCKING'))
);

-- Um alarme aberto por codigo; reabrir atualiza a mesma linha.
CREATE UNIQUE INDEX uq_bus_alarms_open ON notifications.bus_alarms(code) WHERE resolved_at IS NULL;

CREATE FUNCTION notifications.sync_bus_alarms(p_alarms jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = notifications, pg_temp AS $$
DECLARE
  v_codes text[];
  v_count integer;
BEGIN
  SELECT coalesce(array_agg(entry->>'code'), '{}')
    INTO v_codes
    FROM jsonb_array_elements(p_alarms) AS entry;

  INSERT INTO notifications.bus_alarms(code, severity, message, context, opened_at, updated_at, resolved_at)
  SELECT entry->>'code', entry->>'severity', entry->>'message', entry->'context',
         clock_timestamp(), clock_timestamp(), NULL
    FROM jsonb_array_elements(p_alarms) AS entry
  ON CONFLICT (code) WHERE resolved_at IS NULL DO UPDATE
     SET severity = EXCLUDED.severity,
         message = EXCLUDED.message,
         context = EXCLUDED.context,
         updated_at = clock_timestamp();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE notifications.bus_alarms
     SET resolved_at = clock_timestamp(), updated_at = clock_timestamp()
   WHERE resolved_at IS NULL AND NOT (code = ANY (v_codes));

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION notifications.sync_bus_alarms(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notifications.sync_bus_alarms(jsonb) TO vortex_app;

-- Leitura pelo healthcheck (agregado, sem tenant). Nao ha RLS aqui porque a
-- tabela nao carrega dado de cliente: o app so tem SELECT.
GRANT SELECT ON notifications.bus_alarms TO vortex_app;
