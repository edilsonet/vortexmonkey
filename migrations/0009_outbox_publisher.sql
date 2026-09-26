-- ============================================================
-- VORTEX v4 — Publicacao do outbox no bus (RabbitMQ)
--
-- O outbox nasce dentro da transacao do bloco do ledger (0003). O worker que
-- publica roda FORA do contexto de tenant (um unico processo publica eventos de
-- todos os tenants), entao o acesso passa por funcoes SECURITY DEFINER: o RLS
-- continua valendo para o app, e o worker so enxerga/atualiza via estas funcoes.
--
-- `claim_outbox_batch` trava as linhas (FOR UPDATE SKIP LOCKED) e incrementa
-- `attempts`; o worker publica e marca `published_at` na MESMA transacao, o que
-- impede dois workers de pegarem o mesmo evento. Se o COMMIT falhar apos a
-- publicacao, o evento volta a ficar pendente: entrega at-least-once, e o
-- consumidor deduplica por `messageId`.
-- ============================================================

ALTER TABLE ledger.outbox_events ADD COLUMN next_attempt_at timestamptz;

-- Indice parcial para a varredura do worker (o de 0003 ordena por occurred_at).
CREATE INDEX idx_outbox_ready ON ledger.outbox_events(occurred_at)
  WHERE published_at IS NULL;

CREATE FUNCTION ledger.claim_outbox_batch(p_limit integer)
RETURNS SETOF ledger.outbox_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
BEGIN
  RETURN QUERY
  WITH ready AS (
    SELECT id
      FROM ledger.outbox_events
     WHERE published_at IS NULL
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

CREATE FUNCTION ledger.mark_outbox_published(p_ids uuid[])
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  WITH updated AS (
    UPDATE ledger.outbox_events
       SET published_at = now(), last_error = NULL, next_attempt_at = NULL
     WHERE id = ANY(p_ids) AND published_at IS NULL
     RETURNING 1
  )
  SELECT count(*)::integer FROM updated;
$$;

-- Falha nao bloqueia a fila: backoff exponencial (5s * 2^attempts, teto de 1h).
CREATE FUNCTION ledger.mark_outbox_failed(p_id uuid, p_error text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
  UPDATE ledger.outbox_events
     SET last_error = left(p_error, 2000),
         next_attempt_at = now() + least(
           (power(2, least(attempts, 10))::integer) * interval '5 seconds',
           interval '1 hour'
         )
   WHERE id = p_id AND published_at IS NULL;
$$;

REVOKE ALL ON FUNCTION ledger.claim_outbox_batch(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION ledger.mark_outbox_published(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION ledger.mark_outbox_failed(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ledger.claim_outbox_batch(integer) TO vortex_app;
GRANT EXECUTE ON FUNCTION ledger.mark_outbox_published(uuid[]) TO vortex_app;
GRANT EXECUTE ON FUNCTION ledger.mark_outbox_failed(uuid, text) TO vortex_app;
