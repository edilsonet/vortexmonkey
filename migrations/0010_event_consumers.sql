-- ============================================================
-- VORTEX v4 — Consumidores de eventos (idempotencia + projecao)
--
-- O publisher (0009) entrega at-least-once: se o COMMIT falhar depois da
-- publicacao, o evento volta a pendente e e publicado de novo. Por isso todo
-- consumidor deduplica por `messageId`, e o faz numa tabela de inbox:
-- `ledger.consumer_inbox`, com chave (consumer_name, message_id).
--
-- O consumidor roda sem contexto de requisicao; a inbox e escrita por funcoes
-- SECURITY DEFINER, como no publisher, para nao depender do RLS de tenant.
--
-- A projecao `notifications.alerts` e estado CORRENTE (um alerta por item),
-- derivado do ledger: nao duplica historico, e o que alimenta os badges da
-- Shell (Hub Preditivo). Quem resolve o alerta e o proprio consumidor quando o
-- item sai da condicao de urgencia.
-- ============================================================

CREATE TABLE ledger.consumer_inbox (
  consumer_name varchar(80) NOT NULL,
  message_id uuid NOT NULL,
  event_type varchar(120) NOT NULL,
  tenant_id uuid NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'PROCESSING',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at timestamptz,
  PRIMARY KEY (consumer_name, message_id),
  CONSTRAINT consumer_inbox_status CHECK (status IN ('PROCESSING', 'PROCESSED', 'FAILED', 'DEAD'))
);

CREATE INDEX idx_consumer_inbox_status ON ledger.consumer_inbox(consumer_name, status);

-- Registra a entrega e devolve o estado atual. Se a mensagem ja foi processada,
-- devolve PROCESSED sem incrementar tentativas; senao marca PROCESSING e conta
-- mais uma tentativa. O consumidor usa `attempts` para decidir entre retentar e
-- mandar para a dead-letter queue.
CREATE FUNCTION ledger.begin_consumer_message(
  p_consumer text,
  p_message_id uuid,
  p_event_type text,
  p_tenant_id uuid
)
RETURNS TABLE(status text, attempts integer)
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  INSERT INTO ledger.consumer_inbox(consumer_name, message_id, event_type, tenant_id, status, attempts)
  VALUES (p_consumer, p_message_id, p_event_type, p_tenant_id, 'PROCESSING', 1)
  ON CONFLICT (consumer_name, message_id) DO UPDATE
     SET attempts = CASE
           WHEN ledger.consumer_inbox.status = 'PROCESSED' THEN ledger.consumer_inbox.attempts
           ELSE ledger.consumer_inbox.attempts + 1
         END,
         status = CASE
           WHEN ledger.consumer_inbox.status = 'PROCESSED' THEN 'PROCESSED'
           ELSE 'PROCESSING'
         END,
         last_error = CASE
           WHEN ledger.consumer_inbox.status = 'PROCESSED' THEN ledger.consumer_inbox.last_error
           ELSE NULL
         END
  RETURNING consumer_inbox.status, consumer_inbox.attempts;
$$;

CREATE FUNCTION ledger.mark_consumer_processed(p_consumer text, p_message_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.consumer_inbox
     SET status = 'PROCESSED', processed_at = clock_timestamp(), last_error = NULL
   WHERE consumer_name = p_consumer AND message_id = p_message_id;
$$;

-- Devolve o total de tentativas apos a falha, para o consumidor decidir o
-- destino da mensagem (retry ou DLQ).
CREATE FUNCTION ledger.mark_consumer_failed(
  p_consumer text,
  p_message_id uuid,
  p_error text,
  p_dead boolean
)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.consumer_inbox
     SET status = CASE WHEN p_dead THEN 'DEAD' ELSE 'FAILED' END,
         last_error = left(p_error, 2000)
   WHERE consumer_name = p_consumer AND message_id = p_message_id
  RETURNING attempts;
$$;

REVOKE ALL ON FUNCTION ledger.begin_consumer_message(text, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION ledger.mark_consumer_processed(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION ledger.mark_consumer_failed(text, uuid, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ledger.begin_consumer_message(text, uuid, text, uuid) TO vortex_app;
GRANT EXECUTE ON FUNCTION ledger.mark_consumer_processed(text, uuid) TO vortex_app;
GRANT EXECUTE ON FUNCTION ledger.mark_consumer_failed(text, uuid, text, boolean) TO vortex_app;

-- ---------------------------------------------------------------------------
-- Projecao de alertas (Hub Preditivo)
-- ---------------------------------------------------------------------------

CREATE TABLE notifications.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  aircraft_id uuid NOT NULL,
  item_id uuid NOT NULL,
  code varchar(80) NOT NULL,
  severity varchar(16) NOT NULL,
  urgency varchar(16) NOT NULL,
  title text NOT NULL,
  detail text,
  source_event_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz,
  CONSTRAINT alerts_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'BLOCKING')),
  CONSTRAINT alerts_urgency CHECK (urgency IN ('overdue', 'due_soon', 'upcoming', 'none'))
);

-- Um alerta corrente por (tenant, item); reabrir o mesmo item atualiza a linha.
CREATE UNIQUE INDEX uq_alerts_item ON notifications.alerts(tenant_id, item_id);
CREATE INDEX idx_alerts_open ON notifications.alerts(tenant_id, company_id) WHERE resolved_at IS NULL;

-- Recalcula os alertas de uma aeronave a partir de `p_alerts` (estado corrente).
-- Alertas ativos que nao vieram na lista sao resolvidos, o que torna a operacao
-- idempotente: reprocessar a mesma mensagem converge para o mesmo estado.
CREATE FUNCTION notifications.project_alerts(
  p_tenant_id uuid,
  p_company_id uuid,
  p_aircraft_id uuid,
  p_source_event_id uuid,
  p_alerts jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = notifications, identity, pg_temp AS $$
DECLARE
  v_active uuid[];
  v_count integer;
BEGIN
  SELECT coalesce(array_agg((entry->>'itemId')::uuid), '{}')
    INTO v_active
    FROM jsonb_array_elements(p_alerts) AS entry;

  INSERT INTO notifications.alerts(
    tenant_id, company_id, aircraft_id, item_id, code, severity, urgency,
    title, detail, source_event_id)
  SELECT p_tenant_id, p_company_id, p_aircraft_id,
         (entry->>'itemId')::uuid,
         coalesce(entry->>'code', 'COMPLIANCE'),
         entry->>'severity',
         entry->>'urgency',
         coalesce(entry->>'title', 'Item de conformidade'),
         entry->>'detail',
         p_source_event_id
    FROM jsonb_array_elements(p_alerts) AS entry
  ON CONFLICT (tenant_id, item_id) DO UPDATE
     SET severity = EXCLUDED.severity,
         urgency = EXCLUDED.urgency,
         title = EXCLUDED.title,
         detail = EXCLUDED.detail,
         source_event_id = EXCLUDED.source_event_id,
         updated_at = clock_timestamp(),
         resolved_at = NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE notifications.alerts
     SET resolved_at = clock_timestamp(), updated_at = clock_timestamp()
   WHERE tenant_id = p_tenant_id
     AND aircraft_id = p_aircraft_id
     AND resolved_at IS NULL
     AND NOT (item_id = ANY (v_active));

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION notifications.project_alerts(uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notifications.project_alerts(uuid, uuid, uuid, uuid, jsonb) TO vortex_app;

-- Leitura pela API: RLS por tenant E empresa, como nas tabelas de ops.
ALTER TABLE notifications.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY alerts_tenant_company_select ON notifications.alerts FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
);

GRANT SELECT ON notifications.alerts TO vortex_app;
