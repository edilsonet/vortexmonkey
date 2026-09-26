/**
 * Traducao de uma linha de `ledger.outbox_events` em mensagem de bus.
 *
 * Puro de proposito: e a unica parte do publicador que nao fala com rede nem
 * banco, entao da para testar o contrato publicado sem subir RabbitMQ.
 */

export interface OutboxEventRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly company_id: string | null;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly event_type: string;
  readonly payload: unknown;
  readonly occurred_at: Date | string;
  readonly attempts: number;
}

export interface BusMessage {
  /** Igual ao `id` do outbox: chave de deduplicacao do consumidor. */
  readonly messageId: string;
  readonly type: string;
  readonly tenantId: string;
  readonly companyId: string | null;
  readonly userId: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly attempts: number;
  readonly payload: unknown;
}

/** Routing key do topico: o proprio `event_type` (ex.: `ops.aircraft.AIRCRAFT_CREATED`). */
export function routingKeyFor(row: OutboxEventRow): string {
  return row.event_type;
}

export function toBusMessage(row: OutboxEventRow): BusMessage {
  return {
    messageId: row.id,
    type: row.event_type,
    tenantId: row.tenant_id,
    companyId: row.company_id,
    userId: row.user_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    occurredAt: new Date(row.occurred_at).toISOString(),
    attempts: row.attempts,
    payload: row.payload,
  };
}
