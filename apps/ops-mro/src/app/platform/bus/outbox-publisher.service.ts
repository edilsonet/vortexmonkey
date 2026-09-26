import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { DatabaseService, type SqlClient } from '../database/database.service';
import { EVENT_BUS, type EventBus } from './rabbitmq.service';
import { routingKeyFor, toBusMessage, type OutboxEventRow } from './outbox-message';

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_POLL_MS = 1_000;
const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * Worker do outbox transacional.
 *
 * Ciclo: `claim_outbox_batch` trava e incrementa as tentativas; cada evento e
 * publicado no bus e marcado como publicado na MESMA transacao. Como as linhas
 * ficam travadas ate o COMMIT, duas instancias nunca publicam o mesmo evento
 * (`FOR UPDATE SKIP LOCKED`). Falha de publicacao vira `last_error` + backoff,
 * sem derrubar a API.
 */
@Injectable()
export class OutboxPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly batchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
  private readonly pollMs = Number(process.env.OUTBOX_POLL_MS ?? DEFAULT_POLL_MS);
  private readonly maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);

  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  public constructor(
    private readonly database: DatabaseService,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
  ) {}

  public onModuleInit(): void {
    if (!process.env.RABBITMQ_URL) {
      this.logger.warn('RABBITMQ_URL ausente: outbox permanece apenas gravado, sem publicacao.');
      return;
    }
    this.stopped = false;
    this.schedule(0);
  }

  public async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.bus.close();
  }

  /** Publica um lote e devolve quantos eventos foram confirmados. */
  public async publishBatch(): Promise<{ claimed: number; published: number }> {
    return this.database.withTransaction(async (client) => {
      const claimed = await client.query<OutboxEventRow>(
        'SELECT * FROM ledger.claim_outbox_batch($1)',
        [this.batchSize],
      );
      if (claimed.rows.length === 0) return { claimed: 0, published: 0 };

      const published: string[] = [];
      for (const row of claimed.rows) {
        try {
          await this.bus.publish(routingKeyFor(row), toBusMessage(row));
          published.push(row.id);
        } catch (error) {
          await this.markFailed(client, row.id, error);
        }
      }

      if (published.length > 0) {
        await client.query('SELECT ledger.mark_outbox_published($1::uuid[])', [published]);
      }
      return { claimed: claimed.rows.length, published: published.length };
    });
  }

  private async markFailed(client: SqlClient, id: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Falha ao publicar evento ${id}: ${message}`);
    await client.query('SELECT ledger.mark_outbox_failed($1, $2, $3)', [
      id,
      message,
      this.maxAttempts,
    ]);
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
    this.timer.unref?.();
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    try {
      const result = await this.publishBatch();
      const idle = result.claimed === 0;
      this.schedule(idle ? this.pollMs : 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ciclo do outbox falhou: ${message}`);
      this.schedule(this.pollMs);
    } finally {
      this.running = false;
    }
  }
}
