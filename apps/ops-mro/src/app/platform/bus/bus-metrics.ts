import type { AlertSeverity, BusAlarm, ConsumerMetrics, OutboxMetrics } from '@vortex/shared-dto';

/** `pg` devolve `count(*)` (bigint) como string; normaliza para numero. */
export interface OutboxMetricsRow {
  pending: string | number;
  abandoned: string | number;
  published: string | number;
  oldest_pending_at: Date | string | null;
  lag_seconds: string | number | null;
  max_pending_attempts: string | number;
}

export interface ConsumerMetricsRow {
  processed: string | number;
  failed: string | number;
  dead: string | number;
  processing: string | number;
}

export interface BusAlarmRow {
  code: string;
  severity: AlertSeverity;
  message: string;
  context: Record<string, unknown> | null;
  opened_at: Date | string;
  updated_at: Date | string;
}

export function toOutboxMetrics(row: OutboxMetricsRow): OutboxMetrics {
  return {
    pending: Number(row.pending),
    abandoned: Number(row.abandoned),
    published: Number(row.published),
    oldestPendingAt:
      row.oldest_pending_at === null
        ? null
        : new Date(row.oldest_pending_at).toISOString(),
    lagSeconds: row.lag_seconds === null ? null : Number(row.lag_seconds),
    maxPendingAttempts: Number(row.max_pending_attempts),
  };
}

export function toConsumerMetrics(
  consumer: string,
  row: ConsumerMetricsRow,
): ConsumerMetrics {
  return {
    consumer,
    processed: Number(row.processed),
    failed: Number(row.failed),
    dead: Number(row.dead),
    processing: Number(row.processing),
  };
}

export function toBusAlarm(row: BusAlarmRow): BusAlarm {
  return {
    code: row.code,
    severity: row.severity,
    message: row.message,
    context: row.context,
    openedAt: new Date(row.opened_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
