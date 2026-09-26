import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { readSecret } from '@vortex/config';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';
import { DatabaseService } from '../../platform/database/database.service';

interface OutboxEvent { id: string; tenant_id: string; event_type: string; payload: unknown }
@Injectable()
export class OutboxPublisher implements OnModuleInit, OnApplicationShutdown {
  private connection?: ChannelModel; private channel?: ConfirmChannel; private timer?: NodeJS.Timeout;
  public constructor(private readonly database: DatabaseService) {}
  public async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    const password = readSecret('RABBITMQ_PASSWORD_FILE', 'RABBITMQ_PASSWORD');
    this.connection = await amqp.connect({ hostname: process.env.RABBITMQ_HOST ?? '127.0.0.1', port: Number(process.env.RABBITMQ_PORT ?? 5672), username: process.env.RABBITMQ_USER ?? 'vortex', password });
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange('vortex.domain', 'topic', { durable: true });
    this.timer = setInterval(() => void this.publishBatch(), 2_000); this.timer.unref();
  }
  private async publishBatch(): Promise<void> {
    if (!this.channel) return;
    const result = await this.database.query<OutboxEvent>('SELECT * FROM ledger.claim_outbox_events($1)', [100]);
    for (const event of result.rows) {
      this.channel.publish('vortex.domain', event.event_type, Buffer.from(JSON.stringify(event.payload)), { persistent: true, contentType: 'application/json', messageId: event.id, headers: { tenant_id: event.tenant_id } });
    }
    await this.channel.waitForConfirms();
    if (result.rows.length) await this.database.query('SELECT ledger.mark_outbox_published($1::uuid[])', [result.rows.map((event) => event.id)]);
  }
  public async onApplicationShutdown(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.channel?.close(); await this.connection?.close(); }
}
