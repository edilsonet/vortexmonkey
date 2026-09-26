import { Injectable } from '@nestjs/common';
import type { BusMetrics } from '@vortex/shared-dto';
import { DatabaseService } from '../database/database.service';
import {
  toBusAlarm,
  toConsumerMetrics,
  toOutboxMetrics,
  type BusAlarmRow,
  type ConsumerMetricsRow,
  type OutboxMetricsRow,
} from './bus-metrics';
import { CONSUMER_NAME } from './event-consumer.service';

/**
 * Leitura operacional do bus. Roda sem contexto de tenant pelos helpers
 * `SECURITY DEFINER` e devolve so contagens/atraso: nada de dado de cliente.
 */
@Injectable()
export class BusMetricsService {
  public constructor(private readonly database: DatabaseService) {}

  public async snapshot(): Promise<BusMetrics> {
    const [outbox, inbox, alarms] = await Promise.all([
      this.database.query<OutboxMetricsRow>('SELECT * FROM ledger.outbox_metrics()'),
      this.database.query<ConsumerMetricsRow>(
        'SELECT * FROM ledger.inbox_metrics($1)',
        [CONSUMER_NAME],
      ),
      this.database.query<BusAlarmRow>(
        `SELECT code, severity, message, context, opened_at, updated_at
           FROM notifications.bus_alarms
          WHERE resolved_at IS NULL
          ORDER BY
            CASE severity WHEN 'BLOCKING' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
            opened_at`,
      ),
    ]);
    return {
      outbox: toOutboxMetrics(
        outbox.rows[0] ?? {
          pending: 0,
          abandoned: 0,
          published: 0,
          oldest_pending_at: null,
          lag_seconds: null,
          max_pending_attempts: 0,
        },
      ),
      consumer: toConsumerMetrics(
        CONSUMER_NAME,
        inbox.rows[0] ?? { processed: 0, failed: 0, dead: 0, processing: 0 },
      ),
      alarms: alarms.rows.map(toBusAlarm),
    };
  }
}
