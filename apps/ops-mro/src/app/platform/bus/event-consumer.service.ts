import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { DatabaseService } from '../database/database.service';
import { EventHandlerRegistry } from './event-handler';
import { VORTEX_EVENTS_EXCHANGE } from './rabbitmq.service';
import type { BusMessage } from './outbox-message';

/** Nome do consumidor na inbox: separa a dedup por app. */
export const CONSUMER_NAME = 'ops-mro';
export const OPS_MRO_QUEUE = 'ops-mro.events';

const RETRY_EXCHANGE = 'vortex.events.retry';
const RETRY_QUEUE = 'ops-mro.events.retry';
const DLX_EXCHANGE = 'vortex.events.dlx';
const DLQ_QUEUE = 'ops-mro.events.dlq';

const DEFAULT_RETRY_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_PREFETCH = 10;
const RECONNECT_MS = 5_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Worker consumidor do bus.
 *
 * Fluxo: dedup na inbox -> handler -> marca PROCESSED e confirma (ack). Se o
 * handler falhar, a mensagem vai para uma fila de retry com TTL (volta sozinha
 * para a fila principal depois do atraso); passado o teto de tentativas, e
 * publicada na dead-letter queue e confirmada, sem travar a fila.
 *
 * A topologia e declarada pelo proprio consumidor (fila principal -> DLX de
 * retry -> volta para o exchange; esgotada -> DLX de descarte), o que evita
 * acoplar o publisher ao layout de filas de cada app.
 */
@Injectable()
export class EventConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EventConsumer.name);
  private readonly url = process.env.RABBITMQ_URL;
  private readonly retryMs = Number(process.env.CONSUMER_RETRY_MS ?? DEFAULT_RETRY_MS);
  private readonly maxAttempts = Number(
    process.env.CONSUMER_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS,
  );
  private readonly prefetch = Number(process.env.CONSUMER_PREFETCH ?? DEFAULT_PREFETCH);

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;

  public constructor(
    private readonly database: DatabaseService,
    private readonly registry: EventHandlerRegistry,
  ) {}

  public onApplicationBootstrap(): void {
    if (!this.url) {
      this.logger.warn('RABBITMQ_URL ausente: consumidor de eventos desligado.');
      return;
    }
    if (this.registry.size() === 0) {
      this.logger.warn('Nenhum handler registrado: consumidor de eventos desligado.');
      return;
    }
    this.stopped = false;
    void this.connect();
  }

  public async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    await this.closeConnection();
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      const connection = await amqp.connect(this.url as string);
      connection.on('error', (error: Error) =>
        this.handleDrop('conexao', error.message),
      );
      connection.on('close', () => this.handleDrop('conexao', 'encerrada'));

      const channel = await connection.createChannel();
      channel.on('error', (error: Error) => this.handleDrop('canal', error.message));
      channel.on('close', () => this.handleDrop('canal', 'encerrado'));

      await this.declareTopology(channel);
      await channel.prefetch(this.prefetch);
      await channel.consume(
        OPS_MRO_QUEUE,
        (message) => void this.onMessage(channel, message),
        { noAck: false },
      );

      this.connection = connection;
      this.channel = channel;
      this.logger.log(
        `Consumindo ${OPS_MRO_QUEUE} (${this.registry.size()} evento(s), teto de ${this.maxAttempts} tentativas).`,
      );
    } catch (error) {
      this.logger.warn(`Falha ao conectar o consumidor: ${errorMessage(error)}`);
      this.scheduleReconnect();
    }
  }

  private async declareTopology(channel: amqp.Channel): Promise<void> {
    await channel.assertExchange(VORTEX_EVENTS_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(RETRY_EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });

    // Esgotou o retry -> volta para o exchange de eventos com a routing key
    // original, e a fila principal reentrega.
    await channel.assertQueue(OPS_MRO_QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': RETRY_EXCHANGE },
    });
    await channel.bindQueue(OPS_MRO_QUEUE, VORTEX_EVENTS_EXCHANGE, 'ops.#');

    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': this.retryMs,
        'x-dead-letter-exchange': VORTEX_EVENTS_EXCHANGE,
      },
    });
    await channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, '#');

    await channel.assertQueue(DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, '#');
  }

  private async onMessage(
    channel: amqp.Channel,
    received: amqp.ConsumeMessage | null,
  ): Promise<void> {
    if (received === null) return;

    const message = this.parse(received);
    if (message === null) {
      this.toDeadLetter(channel, received, null, 'Envelope JSON invalido.');
      channel.ack(received);
      return;
    }

    const handler = this.registry.resolve(message.type);
    if (handler === undefined) {
      // Evento de outro app que caiu nesta fila: confirma e ignora.
      channel.ack(received);
      return;
    }

    const delivery = await this.begin(message);
    if (delivery === null) {
      // Sem inbox nao ha dedup; nao processa e devolve para o retry.
      channel.nack(received, false, false);
      return;
    }
    if (delivery.status === 'PROCESSED') {
      channel.ack(received);
      return;
    }

    try {
      await handler.handle(message);
      await this.database.query('SELECT ledger.mark_consumer_processed($1, $2)', [
        CONSUMER_NAME,
        message.messageId,
      ]);
      channel.ack(received);
    } catch (error) {
      const reason = errorMessage(error);
      const dead = delivery.attempts >= this.maxAttempts;
      await this.database.query('SELECT ledger.mark_consumer_failed($1, $2, $3, $4)', [
        CONSUMER_NAME,
        message.messageId,
        reason,
        dead,
      ]);
      this.logger.warn(
        `Evento ${message.type} (${message.messageId}) falhou na tentativa ${delivery.attempts}/${this.maxAttempts}: ${reason}`,
      );
      if (dead) {
        this.toDeadLetter(channel, received, message, reason);
        channel.ack(received);
      } else {
        channel.nack(received, false, false);
      }
    }
  }

  private parse(received: amqp.ConsumeMessage): BusMessage | null {
    try {
      const parsed = JSON.parse(received.content.toString('utf8')) as Partial<BusMessage>;
      if (
        typeof parsed.messageId !== 'string' ||
        typeof parsed.type !== 'string' ||
        typeof parsed.tenantId !== 'string'
      ) {
        return null;
      }
      return parsed as BusMessage;
    } catch {
      return null;
    }
  }

  private async begin(
    message: BusMessage,
  ): Promise<{ status: string; attempts: number } | null> {
    try {
      const result = await this.database.query<{ status: string; attempts: number }>(
        'SELECT status, attempts FROM ledger.begin_consumer_message($1, $2, $3, $4)',
        [CONSUMER_NAME, message.messageId, message.type, message.tenantId],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(
        `Inbox indisponivel para ${message.messageId}: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  private toDeadLetter(
    channel: amqp.Channel,
    received: amqp.ConsumeMessage,
    message: BusMessage | null,
    reason: string,
  ): void {
    try {
      channel.publish(DLX_EXCHANGE, received.fields.routingKey, received.content, {
        contentType: 'application/json',
        deliveryMode: 2,
        messageId: message?.messageId ?? received.properties.messageId,
        type: message?.type ?? received.properties.type,
        appId: CONSUMER_NAME,
        headers: {
          tenantId: message?.tenantId,
          companyId: message?.companyId,
          'x-error': reason,
        },
      });
    } catch (error) {
      this.logger.error(`Falha ao descartar mensagem na DLQ: ${errorMessage(error)}`);
    }
  }

  private handleDrop(origin: string, reason: string): void {
    if (this.channel || this.connection) {
      this.logger.warn(`RabbitMQ (consumidor): ${origin} ${reason}; reconectando.`);
    }
    this.channel = null;
    this.connection = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
    this.reconnectTimer.unref?.();
  }

  private async closeConnection(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = null;
    this.connection = null;
    try {
      await channel?.close();
    } catch {
      // canal ja encerrado
    }
    try {
      await connection?.close();
    } catch {
      // conexao ja encerrada
    }
  }
}
