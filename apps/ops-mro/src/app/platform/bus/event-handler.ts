import { Injectable } from '@nestjs/common';
import type { BusMessage } from './outbox-message';

/**
 * Consumidor de um ou mais tipos de evento.
 *
 * `handle` DEVE ser idempotente: a entrega e at-least-once (o publisher pode
 * repetir apos uma falha de COMMIT) e o mesmo `messageId` pode chegar mais de
 * uma vez apos um crash entre o efeito e o registro de `PROCESSED`. A dedup da
 * inbox cobre o caso normal; o handler cobre o caso de reentrega.
 */
export interface EventHandler {
  readonly eventTypes: readonly string[];
  handle(message: BusMessage): Promise<void>;
}

/** Mapa tipo de evento -> handler, preenchido no boot por cada handler. */
@Injectable()
export class EventHandlerRegistry {
  private readonly handlers = new Map<string, EventHandler>();

  public register(handler: EventHandler): void {
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType);
      if (existing !== undefined && existing !== handler) {
        throw new Error(`Handler duplicado para o evento ${eventType}.`);
      }
      this.handlers.set(eventType, handler);
    }
  }

  public resolve(eventType: string): EventHandler | undefined {
    return this.handlers.get(eventType);
  }

  public size(): number {
    return this.handlers.size;
  }
}
