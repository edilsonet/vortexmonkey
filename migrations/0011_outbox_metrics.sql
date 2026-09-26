-- ============================================================
-- VORTEX v4 — Metricas do outbox/bus e teto de tentativas
--
-- Fecha a lacuna 15.3.1: o outbox deixa de retentar para sempre. Passado o
-- teto, o evento e marcado como ABANDONADO (nao apagado: o bloco do ledger
-- continua la) e sai da varredura do worker; um operador pode reprocessar.
--
-- `ledger.outbox_metrics()` e `ledger.inbox_metrics()` alimentam o healthcheck
-- (`GET /api/health/bus`) sem expor dado de tenant: so contagens e o atraso.
-- ============================================================

ALTER TABLE ledger.outbox_events ADD COLUMN abandoned_at timestamptz;

CREATE INDEX idx_outbox_abandoned ON ledger.outbox_events(abandoned_at)
  WHERE abandoned_at IS NOT NULL;

-- O worker nao varre mais eventos abandonados.
CREATE OR REPLACE FUNCTION ledger.claim_outbox_batch(p_limit integer)
RETURNS SETOF ledger.outbox_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
BEGIN
  RETURN QUERY
  WITH ready AS (
    SELECT id
      FROM ledger.outbox_events
     WHERE published_at IS NULL
       AND abandoned_at IS NULL
       AND (next_attempt_at IS NULL OR next_attempt_at <= now())
     ORDER BY occurred_at
     LIMIT greatest(p_limit, 0)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE ledger.outbox_events e
     SET attempts = e.attempts + 1
    FROM ready
   WHERE e.id = ready.id
  RETURNING e.*;
END;
$$;

-- A assinatura ganha o teto de tentativas. A versao antiga e removida para
-- evitar ambiguidade de sobrecarga com o parametro com default.
DROP FUNCTION ledger.mark_outbox_failed(uuid, text);

CREATE FUNCTION ledger.mark_outbox_failed(
  p_id uuid,
  p_error text,
  p_max_attempts integer DEFAULT 10
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.outbox_events
     SET last_error = left(p_error, 2000),
         abandoned_at = CASE WHEN attempts >= greatest(p_max_attempts, 1) THEN now() ELSE abandoned_at END,
         next_attempt_at = CASE
           WHEN attempts >= greatest(p_max_attempts, 1) THEN NULL
           ELSE now() + least(
             (power(2, least(attempts, 10))::integer) * interval '5 seconds',
             interval '1 hour'
           )
         END
   WHERE id = p_id AND published_at IS NULL;
$$;

REVOKE ALL ON FUNCTION ledger.mark_outbox_failed(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ledger.mark_outbox_failed(uuid, text, integer) TO vortex_app;

CREATE FUNCTION ledger.outbox_metrics()
RETURNS TABLE(
  pending bigint,
  abandoned bigint,
  published bigint,
  oldest_pending_at timestamptz,
  lag_seconds double precision,
  max_pending_attempts integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  SELECT
    count(*) FILTER (WHERE published_at IS NULL AND abandoned_at IS NULL),
    count(*) FILTER (WHERE abandoned_at IS NOT NULL),
    count(*) FILTER (WHERE published_at IS NOT NULL),
    min(occurred_at) FILTER (WHERE published_at IS NULL AND abandoned_at IS NULL),
    extract(epoch FROM now() - min(occurred_at) FILTER (WHERE published_at IS NULL AND abandoned_at IS NULL)),
    coalesce(max(attempts) FILTER (WHERE published_at IS NULL AND abandoned_at IS NULL), 0)::integer
  FROM ledger.outbox_events;
$$;

CREATE FUNCTION ledger.inbox_metrics(p_consumer text)
RETURNS TABLE(processed bigint, failed bigint, dead bigint, processing bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  SELECT
    count(*) FILTER (WHERE status = 'PROCESSED'),
    count(*) FILTER (WHERE status = 'FAILED'),
    count(*) FILTER (WHERE status = 'DEAD'),
    count(*) FILTER (WHERE status = 'PROCESSING')
  FROM ledger.consumer_inbox
  WHERE consumer_name = p_consumer;
$$;

REVOKE ALL ON FUNCTION ledger.outbox_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION ledger.inbox_metrics(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ledger.outbox_metrics() TO vortex_app;
GRANT EXECUTE ON FUNCTION ledger.inbox_metrics(text) TO vortex_app;
