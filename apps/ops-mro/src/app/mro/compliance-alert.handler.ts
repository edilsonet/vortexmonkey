import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { RequestContext } from '@vortex/shared-dto';
import { EventHandlerRegistry, type EventHandler } from '../platform/bus/event-handler';
import type { BusMessage } from '../platform/bus/outbox-message';
import { domainPayload, toAlertProjections } from './alert-projection';
import { MroRepository } from './mro.repository';
import { MroService } from './mro.service';

/** Eventos que mudam o estado de conformidade de uma aeronave. */
export const COMPLIANCE_EVENTS: readonly string[] = [
  'ops.aircraft_meter_readings.METER_READING_RECORDED',
  'ops.meter_resets.METER_RESET_DECLARED',
  'ops.compliance_items.COMPLIANCE_ITEM_CREATED',
  'ops.compliance_items.COMPLIANCE_ITEM_DONE',
];

/**
 * Projeta os alertas do Hub Preditivo a partir dos eventos do ledger.
 *
 * Nao decide conformidade: reaproveita `MroService.assessAircraft`, que ja e a
 * avaliacao usada na leitura, e materializa apenas o ESTADO CORRENTE (um alerta
 * por item). Estados sao derivados do ledger, nunca um historico paralelo.
 */
@Injectable()
export class ComplianceAlertHandler implements EventHandler, OnModuleInit {
  private readonly logger = new Logger(ComplianceAlertHandler.name);
  public readonly eventTypes = COMPLIANCE_EVENTS;

  public constructor(
    private readonly registry: EventHandlerRegistry,
    private readonly mro: MroService,
    private readonly repository: MroRepository,
  ) {}

  public onModuleInit(): void {
    this.registry.register(this);
  }

  public async handle(message: BusMessage): Promise<void> {
    const context: RequestContext = {
      userId: message.userId,
      tenantId: message.tenantId,
      companyId: message.companyId,
    };
    const aircraftId = await this.resolveAircraftId(context, message);
    if (aircraftId === null) {
      this.logger.warn(`Evento ${message.type} sem aeronave resolvivel; ignorado.`);
      return;
    }

    const assessment = await this.mro.assessAircraft(context, aircraftId);
    await this.repository.projectAlerts(context, {
      aircraftId,
      sourceEventId: message.messageId,
      alerts: toAlertProjections(assessment),
    });
  }

  private async resolveAircraftId(
    context: RequestContext,
    message: BusMessage,
  ): Promise<string | null> {
    const domain = domainPayload(message.payload);
    if (domain === null) return null;

    const aircraftId = domain['aircraftId'];
    if (typeof aircraftId === 'string') return aircraftId;

    // A execucao de conformidade nao carrega a aeronave: resolve pelo item.
    const itemId = domain['complianceItemId'];
    if (typeof itemId === 'string') {
      return this.repository.findComplianceItemAircraft(context, itemId);
    }
    return null;
  }
}
