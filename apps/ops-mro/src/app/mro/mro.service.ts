import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_THRESHOLDS,
  URGENCY_RANK,
  assessWB,
  calculateAmortization,
  completeWB,
  computeUtilization,
  dueText,
  effectiveNextDue,
  getCounterValue,
  hoursRemaining,
  nextDueFrom,
  normalizeCounterLog,
  projectDueDate,
  projectionLabel,
  projectionTitle,
  round1,
  toAlertSignal,
  urgencyOf,
  validateCounterUpdate,
} from '@vortex/util-aeronautics';
import type {
  AircraftAlert,
  AircraftComplianceResponse,
  AircraftRecord,
  AmortizationRequest,
  AmortizationResponse,
  ComplianceAssessRequest,
  ComplianceAssessResponse,
  ComplianceItem,
  ComplianceItemRecord,
  CounterValidateRequest,
  CounterValidateResponse,
  CounterValueRequest,
  CounterValueResponse,
  CreateAircraftRequest,
  CreateAircraftResponse,
  CreateComplianceItemRequest,
  CreateComplianceItemResponse,
  CreateComplianceResetRuleRequest,
  CreateMeterResetRequest,
  CreateMeterResetResponse,
  MeterReadingRecord,
  MeterResetRecord,
  RecordComplianceDoneRequest,
  RecordComplianceDoneResponse,
  RecordMeterReadingRequest,
  RecordMeterReadingResponse,
  RequestContext,
  ResetRule,
  Urgency,
  UtilizationRequest,
  UtilizationResponse,
  WBAssessRequest,
  WBAssessResponse,
} from '@vortex/shared-dto';
import { MroRepository, canonicalHours } from './mro.repository';

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

function resolveToday(value?: string): Date {
  return value === undefined ? new Date() : new Date(`${value}T00:00:00Z`);
}

/**
 * Orquestra o motor puro `@vortex/util-aeronautics`. Nao persiste e nao decide
 * conformidade: calcula e sinaliza; a emissao de documento e ato do responsavel
 * tecnico. Persistencia e ledger entram nos fluxos de escrita (fase seguinte).
 */
@Injectable()
export class MroService {
  constructor(private readonly repository: MroRepository) {}

  assessCompliance(request: ComplianceAssessRequest): ComplianceAssessResponse {
    const today = resolveToday(request.today);
    const thresholds = request.thresholds ?? DEFAULT_THRESHOLDS;
    const currentHours = request.currentHours ?? null;
    const currentCycles = request.currentCycles ?? null;
    const resetRules = request.resetRules ?? [];

    // Materializa o vencimento recalculado antes de aplicar o reset cruzado:
    // a revisao geral reseta o relogio da inspecao periodica.
    const items: ComplianceItem[] = request.items.map((item) => {
      const due = nextDueFrom(item);
      return {
        ...item,
        nextDueDate: due.date,
        nextDueHours: due.hours,
        nextDueCycles: due.cycles,
      };
    });

    const assessments = items.map((item) => {
      const nextDue = effectiveNextDue(item, items, resetRules);
      const urgency = urgencyOf(nextDue, currentHours, currentCycles, today, thresholds);
      const remaining = hoursRemaining(nextDue.hours, currentHours);
      return {
        itemId: item.id,
        kind: item.kind,
        label: item.label,
        nextDue,
        urgency,
        dueText: dueText(nextDue, currentHours, today),
        alert: toAlertSignal(item, nextDue, currentHours, urgency, today),
        // Limite de calendario nunca recebe projecao: `remaining` e null sem horas.
        projection:
          request.utilization === undefined
            ? null
            : projectDueDate(remaining, request.utilization, today),
      };
    });

    const worstUrgency = assessments.reduce<Urgency>(
      (worst, assessment) =>
        URGENCY_RANK[assessment.urgency] < URGENCY_RANK[worst] ? assessment.urgency : worst,
      'none',
    );

    return { today: toIsoDate(today), worstUrgency, items: assessments };
  }

  utilization(request: UtilizationRequest): UtilizationResponse {
    const today = resolveToday(request.today);
    const utilization = computeUtilization(request.readings, request.resets ?? [], today);
    const projection = projectDueDate(request.hoursRemaining ?? null, utilization, today);

    return {
      utilization,
      hoursPerMonth: round1(utilization.hoursPerDay * 30.4),
      projection,
      projectionLabel: projection === null ? null : projectionLabel(projection),
      projectionTitle: projectionTitle(utilization),
    };
  }

  assessWeightBalance(request: WBAssessRequest): WBAssessResponse {
    return {
      assessment: assessWB({
        triple: request.triple,
        latestWBDate: request.latestWBDate,
        changes: request.changes,
      }),
      completed: completeWB(request.triple),
    };
  }

  counterValue(request: CounterValueRequest): CounterValueResponse {
    const log = normalizeCounterLog(request.rows, request.counterType);
    return request.lookbackDays === undefined
      ? getCounterValue(log, request.analysisDate)
      : getCounterValue(log, request.analysisDate, request.lookbackDays);
  }

  validateCounter(request: CounterValidateRequest): CounterValidateResponse {
    return validateCounterUpdate(request.history, request.maintenanceDate, request.updates);
  }

  amortization(request: AmortizationRequest): AmortizationResponse {
    return request.counterLog === undefined
      ? calculateAmortization(request.config, request.analysisStart, request.analysisEnd)
      : calculateAmortization(
          request.config,
          request.analysisStart,
          request.analysisEnd,
          request.counterLog,
        );
  }

  // -------------------------------------------------------------------------
  // Persistencia (aeronave, medidores, conformidade)
  // -------------------------------------------------------------------------

  listAircraft(context: RequestContext): Promise<AircraftRecord[]> {
    return this.repository.listAircraft(context);
  }

  createAircraft(
    context: RequestContext,
    input: CreateAircraftRequest,
  ): Promise<CreateAircraftResponse> {
    return this.repository.createAircraft(context, input);
  }

  recordMeterReading(
    context: RequestContext,
    aircraftId: string,
    input: RecordMeterReadingRequest,
  ): Promise<RecordMeterReadingResponse> {
    return this.repository.recordMeterReading(context, aircraftId, input);
  }

  listMeterReadings(context: RequestContext, aircraftId: string): Promise<MeterReadingRecord[]> {
    return this.repository.listMeterReadings(context, aircraftId);
  }

  listMeterResets(context: RequestContext, aircraftId: string): Promise<MeterResetRecord[]> {
    return this.repository.listMeterResets(context, aircraftId);
  }

  createMeterReset(
    context: RequestContext,
    aircraftId: string,
    input: CreateMeterResetRequest,
  ): Promise<CreateMeterResetResponse> {
    return this.repository.createMeterReset(context, aircraftId, input);
  }

  listComplianceItems(
    context: RequestContext,
    aircraftId: string,
  ): Promise<ComplianceItemRecord[]> {
    return this.repository.listComplianceItems(context, aircraftId);
  }

  createComplianceItem(
    context: RequestContext,
    aircraftId: string,
    input: CreateComplianceItemRequest,
  ): Promise<CreateComplianceItemResponse> {
    return this.repository.createComplianceItem(context, aircraftId, input);
  }

  recordComplianceDone(
    context: RequestContext,
    input: RecordComplianceDoneRequest,
  ): Promise<RecordComplianceDoneResponse> {
    return this.repository.recordComplianceDone(context, input);
  }

  listResetRules(context: RequestContext): Promise<ResetRule[]> {
    return this.repository.listResetRules(context);
  }

  /** Alertas correntes do Hub Preditivo, projetados pelo consumidor de eventos. */
  listAlerts(context: RequestContext): Promise<AircraftAlert[]> {
    return this.repository.listAlerts(context);
  }

  createResetRule(
    context: RequestContext,
    input: CreateComplianceResetRuleRequest,
  ): Promise<ResetRule> {
    return this.repository.createResetRule(context, input);
  }

  /**
   * Avalia a conformidade a partir dos dados PERSISTIDOS. A taxa de utilizacao e
   * recalculada das leituras reais (estimadas excluidas pelo motor) e alimenta a
   * projecao de cada item. Nao decide conformidade: devolve vencimento e urgencia.
   */
  async assessAircraft(
    context: RequestContext,
    aircraftId: string,
  ): Promise<AircraftComplianceResponse> {
    const [aircraft, readings, resets, items, resetRules] = await Promise.all([
      this.repository.findAircraft(context, aircraftId),
      this.repository.listMeterReadings(context, aircraftId),
      this.repository.listMeterResets(context, aircraftId),
      this.repository.listComplianceItems(context, aircraftId),
      this.repository.listResetRules(context),
    ]);
    if (aircraft === null) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Aeronave nao encontrada.',
      });
    }
    const today = new Date();
    const utilization = computeUtilization(
      readings.map((reading) => ({
        date: reading.readingDate,
        tach: reading.tach,
        hobbs: reading.hobbs,
        airframe: reading.airframe,
        estimated: reading.estimated,
      })),
      resets.map((reset) => ({ meter: reset.meter, resetDate: reset.resetDate })),
      today,
    );
    const latest = readings.reduce<MeterReadingRecord | null>(
      (current, reading) =>
        current === null || reading.readingDate >= current.readingDate ? reading : current,
      null,
    );
    const currentHours = latest === null ? null : canonicalHours(latest);

    const assessment = this.assessCompliance({
      items,
      resetRules,
      currentHours,
      currentCycles: aircraft.totalCycles,
      today: toIsoDate(today),
      utilization: utilization.confidence === 'none' ? undefined : utilization,
    });
    return {
      ...assessment,
      aircraftId,
      utilization: utilization.confidence === 'none' ? null : utilization,
    };
  }
}
