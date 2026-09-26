import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import * as amqp from 'amqplib';
import type { BusMessage } from './outbox-message';

/** Transporte de eventos. Permite trocar o RabbitMQ por um duplo em testes. */
export interface EventBus {
  publish(routingKey: string, message: BusMessage): Promise<void>;
  close(): Promise<void>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');

/** Exchange de eventos de dominio; um topico, para que cada app escolha o padrao. */
export const VORTEX_EVENTS_EXCHANGE = 'vortex.events';

/**
 * Publicador RabbitMQ com confirmação.
 *
 * A conexão é preguiçosa e resiliente: se o broker estiver fora, a primeira
 * publicação falha, o worker marca a tentativa em `last_error` e tenta de novo
 * depois (backoff no banco). Assim a API nunca cai por causa do bus.
 */
@Injectable()
export class RabbitMqEventBus implements EventBus, OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqEventBus.name);
  private readonly url = process.env.RABBITMQ_URL;
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;

  public enabled(): boolean {
    return Boolean(this.url);
  }

  private async ensureChannel(): Promise<amqp.ConfirmChannel> {
    if (this.channel) return this.channel;
    if (!this.url) throw new Error('RABBITMQ_URL nao configurado.');

    const connection = await amqp.connect(this.url);
    connection.on('error', (error: Error) => this.handleDrop('conexao', error.message));
    // `close` tambem dispara quando o broker reinicia; sem isso o canal morto
    // continuaria em cache e toda publicacao falharia com "Channel closed".
    connection.on('close', () => this.handleDrop('conexao', 'encerrada'));

    const channel = await connection.createConfirmChannel();
    channel.on('error', (error: Error) => this.handleDrop('canal', error.message));
    channel.on('close', () => this.handleDrop('canal', 'encerrado'));
    await channel.assertExchange(VORTEX_EVENTS_EXCHANGE, 'topic', { durable: true });

    this.connection = connection;
    this.channel = channel;
    this.logger.log(`Publicando em ${VORTEX_EVENTS_EXCHANGE} (${this.url}).`);
    return channel;
  }

  public async publish(routingKey: string, message: BusMessage): Promise<void> {
    try {
      const channel = await this.ensureChannel();
      await this.publishOn(channel, routingKey, message);
    } catch (error) {
      // Descarta o canal para forcar reconexao na proxima tentativa.
      await this.discard();
      throw error;
    }
  }

  private async publishOn(
    channel: amqp.ConfirmChannel,
    routingKey: string,
    message: BusMessage,
  ): Promise<void> {
    const body = Buffer.from(JSON.stringify(message));

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        VORTEX_EVENTS_EXCHANGE,
        routingKey,
        body,
        {
          contentType: 'application/json',
          deliveryMode: 2,
          messageId: message.messageId,
          type: message.type,
          timestamp: Date.now(),
          appId: 'vortex-ops-mro',
          headers: { tenantId: message.tenantId, companyId: message.companyId },
        },
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  private handleDrop(origem: string, motivo: string): void {
    if (this.channel || this.connection) {
      this.logger.warn(`RabbitMQ: ${origem} ${motivo}; reconectando na proxima publicacao.`);
    }
    this.channel = null;
    this.connection = null;
  }

  /** Solta as referencias e fecha o que sobrou, sem mascarar o erro original. */
  private async discard(): Promise<void> {
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

  public async close(): Promise<void> {
    try {
      await this.channel?.close();
    } catch {
      // canal ja encerrado
    }
    try {
      await this.connection?.close();
    } catch {
      // conexao ja encerrada
    }
    this.channel = null;
    this.connection = null;
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.close();
  }
}
