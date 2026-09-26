import { Injectable } from '@nestjs/common';
import { DEFAULT_THRESHOLDS, nextDueFrom, urgencyOf } from '@vortex/util-aeronautics';
import type {
  AircraftAlert,
  AircraftRecord,
  ComplianceItemRecord,
  CreateAircraftRequest,
  CreateAircraftResponse,
  CreateComplianceItemRequest,
  CreateComplianceItemResponse,
  CreateComplianceResetRuleRequest,
  CreateMeterResetRequest,
  CreateMeterResetResponse,
  Meter,
  MeterReadingRecord,
  MeterResetRecord,
  MonthCounting,
  NextDue,
  RecordComplianceDoneRequest,
  RecordComplianceDoneResponse,
  RecordMeterReadingRequest,
  RecordMeterReadingResponse,
  RequestContext,
  ResetRule,
  UtilizationMeter,
} from '@vortex/shared-dto';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../platform/database/database.service';
import { LedgerService } from '../platform/ledger/ledger.service';
import { ProtocolService } from '../platform/protocol/protocol.service';

interface AircraftRow {
  id: string;
  registration: string;
  model: string;
  manufacturer: string;
  serial_number: string | null;
  total_hours: number;
  total_cycles: number;
  airworthiness_status: string;
}

interface MeterReadingRow {
  id: string;
  aircraft_id: string;
  reading_date: string;
  tach: number | null;
  hobbs: number | null;
  airframe: number | null;
  estimated: boolean;
  source: string | null;
  notes: string | null;
}

interface ComplianceItemRow {
  id: string;
  aircraft_id: string;
  kind: string;
  label: string;
  regulatory: boolean;
  interval_months: number | null;
  interval_hours: number | null;
  interval_cycles: number | null;
  month_counting: MonthCounting;
  meter: Meter | null;
  last_done_date: string | null;
  last_done_hours: number | null;
  last_done_cycles: number | null;
  next_due_date: string | null;
  next_due_hours: number | null;
  next_due_cycles: number | null;
  notes: string | null;
}

interface MeterResetRow {
  id: string;
  aircraft_id: string;
  meter: UtilizationMeter;
  reset_date: string;
  notes: string | null;
}

interface AlertRow {
  id: string;
  aircraft_id: string;
  item_id: string;
  code: string;
  severity: AircraftAlert['severity'];
  urgency: AircraftAlert['urgency'];
  title: string;
  detail: string | null;
  updated_at: Date | string;
}

/** Linha de alerta a projetar (estado corrente do item de conformidade). */
export interface AlertProjection {
  readonly itemId: string;
  readonly code: string;
  readonly severity: AircraftAlert['severity'];
  readonly urgency: AircraftAlert['urgency'];
  readonly title: string;
  readonly detail: string | null;
}

const AIRCRAFT_COLUMNS = `id, registration, model, manufacturer, serial_number,
  total_hours::float8 AS total_hours, total_cycles, airworthiness_status`;

const READING_COLUMNS = `id, aircraft_id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date,
  tach::float8 AS tach, hobbs::float8 AS hobbs, airframe::float8 AS airframe,
  estimated, source, notes`;

const ITEM_COLUMNS = `id, aircraft_id, kind, label, regulatory,
  interval_months, interval_hours::float8 AS interval_hours, interval_cycles,
  month_counting, meter,
  to_char(last_done_date, 'YYYY-MM-DD') AS last_done_date,
  last_done_hours::float8 AS last_done_hours, last_done_cycles,
  to_char(next_due_date, 'YYYY-MM-DD') AS next_due_date,
  next_due_hours::float8 AS next_due_hours, next_due_cycles,
  notes`;

const RESET_COLUMNS = `id, aircraft_id, meter,
  to_char(reset_date, 'YYYY-MM-DD') AS reset_date, notes`;

/**
 * Horas canonicas de uma leitura: a célula (`airframe`) é o tempo total da
 * aeronave; na ausência, o registrador (`tach`); por último o `hobbs`, que
 * mede tempo de motor ligado e superestima o tempo em serviço. É a MESMA regra
 * usada para consolidar `ops.aircraft.total_hours` e para a avaliação de
 * conformidade — uma única fonte de verdade.
 */
export function canonicalHours(reading: {
  tach?: number | null;
  hobbs?: number | null;
  airframe?: number | null;
}): number | null {
  return reading.airframe ?? reading.tach ?? reading.hobbs ?? null;
}

function toAircraft(row: AircraftRow): AircraftRecord {
  return {
    id: row.id,
    registration: row.registration,
    model: row.model,
    manufacturer: row.manufacturer,
    serialNumber: row.serial_number,
    totalHours: row.total_hours,
    totalCycles: row.total_cycles,
    airworthinessStatus: row.airworthiness_status,
  };
}

function toReading(row: MeterReadingRow): MeterReadingRecord {
  return {
    id: row.id,
    aircraftId: row.aircraft_id,
    readingDate: row.reading_date,
    tach: row.tach,
    hobbs: row.hobbs,
    airframe: row.airframe,
    estimated: row.estimated,
    source: row.source,
    notes: row.notes,
  };
}

export function toComplianceItem(row: ComplianceItemRow): ComplianceItemRecord {
  return {
    id: row.id,
    aircraftId: row.aircraft_id,
    kind: row.kind,
    label: row.label,
    regulatory: row.regulatory,
    interval: {
      months: row.interval_months,
      hours: row.interval_hours,
      cycles: row.interval_cycles,
    },
    monthCounting: row.month_counting,
    meter: row.meter,
    lastDoneDate: row.last_done_date,
    lastDoneHours: row.last_done_hours,
    lastDoneCycles: row.last_done_cycles,
    nextDueDate: row.next_due_date,
    nextDueHours: row.next_due_hours,
    nextDueCycles: row.next_due_cycles,
    notes: row.notes,
  };
}

function toMeterReset(row: MeterResetRow): MeterResetRecord {
  return {
    id: row.id,
    aircraftId: row.aircraft_id,
    meter: row.meter,
    resetDate: row.reset_date,
    notes: row.notes,
  };
}

/**
 * Vencimento a persistir, derivado do item completo. Usa a MESMA funcao do
 * motor (`nextDueFrom`): o calculo da borda e o calculo gravado nao divergem.
 */
function computeNextDue(item: ComplianceItemRecord): NextDue {
  return nextDueFrom({
    ...item,
    nextDueDate: null,
    nextDueHours: null,
    nextDueCycles: null,
  });
}

/**
 * Persistencia do ERP Manutencao. Toda escrita acontece em UMA transacao que
 * tambem ancora o bloco no ledger (regra 1): se a gravacao falhar, o bloco
 * tambem e desfeito. O RLS e aplicado pelo `withContext`; sem vinculo ativo o
 * INSERT e recusado pelo proprio banco (PERMISSION_DENIED).
 */
@Injectable()
export class MroRepository {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
    private readonly protocol: ProtocolService,
  ) {}

  public listAircraft(context: RequestContext): Promise<AircraftRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<AircraftRow>(
        `SELECT ${AIRCRAFT_COLUMNS} FROM ops.aircraft ORDER BY registration`,
      );
      return result.rows.map(toAircraft);
    });
  }

  public findAircraft(context: RequestContext, aircraftId: string): Promise<AircraftRecord | null> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<AircraftRow>(
        `SELECT ${AIRCRAFT_COLUMNS} FROM ops.aircraft WHERE id = $1`,
        [aircraftId],
      );
      const row = result.rows[0];
      return row === undefined ? null : toAircraft(row);
    });
  }

  public createAircraft(
    context: RequestContext,
    input: CreateAircraftRequest,
  ): Promise<CreateAircraftResponse> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.aircraft',
        entityId: id,
        actionType: 'AIRCRAFT_CREATED',
        payload: { ...input },
      });
      const result = await client.query<AircraftRow>(
        `INSERT INTO ops.aircraft(id, tenant_id, company_id, registration, model, manufacturer,
           serial_number, total_hours, total_cycles, created_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${AIRCRAFT_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId,
          input.registration,
          input.model,
          input.manufacturer,
          input.serialNumber ?? null,
          input.totalHours ?? 0,
          input.totalCycles ?? 0,
          context.userId,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de aeronave nao retornou registro.');
      return { aircraft: toAircraft(row), ledgerBlockId: blockId, ledgerHash };
    });
  }

  public recordMeterReading(
    context: RequestContext,
    aircraftId: string,
    input: RecordMeterReadingRequest,
  ): Promise<RecordMeterReadingResponse> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.aircraft_meter_readings',
        entityId: id,
        actionType: 'METER_READING_RECORDED',
        payload: { aircraftId, ...input },
      });
      const result = await client.query<MeterReadingRow>(
        `INSERT INTO ops.aircraft_meter_readings(
           id, tenant_id, company_id, aircraft_id, reading_date, tach, hobbs, airframe,
           estimated, source, notes, recorded_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${READING_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId,
          aircraftId,
          input.readingDate,
          input.tach ?? null,
          input.hobbs ?? null,
          input.airframe ?? null,
          input.estimated ?? false,
          input.source ?? null,
          input.notes ?? null,
          context.userId,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de leitura nao retornou registro.');

      // Consolida os totais da aeronave a partir da leitura recem-registrada. A
      // tabela `total_hours` e um CACHE do historico (a leitura e append-only):
      // `GREATEST` garante monotonicidade e uma leitura antiga atrasada nao
      // regride o total.
      const hours = canonicalHours(input);
      if (hours !== null) {
        await client.query(
          `UPDATE ops.aircraft
             SET total_hours = GREATEST(total_hours, $2), updated_at = clock_timestamp()
           WHERE id = $1`,
          [aircraftId, hours],
        );
      }
      return { reading: toReading(row), ledgerBlockId: blockId, ledgerHash };
    });
  }

  public listMeterReadings(
    context: RequestContext,
    aircraftId: string,
  ): Promise<MeterReadingRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<MeterReadingRow>(
        `SELECT ${READING_COLUMNS} FROM ops.aircraft_meter_readings
         WHERE aircraft_id = $1 ORDER BY reading_date, created_at`,
        [aircraftId],
      );
      return result.rows.map(toReading);
    });
  }

  public listMeterResets(
    context: RequestContext,
    aircraftId: string,
  ): Promise<MeterResetRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<MeterResetRow>(
        `SELECT ${RESET_COLUMNS} FROM ops.meter_resets
         WHERE aircraft_id = $1 ORDER BY reset_date, meter`,
        [aircraftId],
      );
      return result.rows.map(toMeterReset);
    });
  }

  public createMeterReset(
    context: RequestContext,
    aircraftId: string,
    input: CreateMeterResetRequest,
  ): Promise<CreateMeterResetResponse> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.meter_resets',
        entityId: id,
        actionType: 'METER_RESET_DECLARED',
        payload: { aircraftId, ...input },
      });
      const result = await client.query<MeterResetRow>(
        `INSERT INTO ops.meter_resets(
           id, tenant_id, company_id, aircraft_id, meter, reset_date, notes, created_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${RESET_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId,
          aircraftId,
          input.meter,
          input.resetDate,
          input.notes ?? null,
          context.userId,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de reset nao retornou registro.');
      return { reset: toMeterReset(row), ledgerBlockId: blockId, ledgerHash };
    });
  }

  public listComplianceItems(
    context: RequestContext,
    aircraftId: string,
  ): Promise<ComplianceItemRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<ComplianceItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM ops.compliance_items
         WHERE aircraft_id = $1 AND status = 'ATIVO' ORDER BY next_due_date NULLS LAST`,
        [aircraftId],
      );
      return result.rows.map(toComplianceItem);
    });
  }

  public listResetRules(context: RequestContext): Promise<ResetRule[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<{ adjusted_kind: string; adjusted_by_kind: string }>(
        `SELECT adjusted_kind, adjusted_by_kind FROM ops.compliance_reset_rules
         ORDER BY adjusted_kind`,
      );
      return result.rows.map((row) => ({
        adjustedKind: row.adjusted_kind,
        adjustedByKind: row.adjusted_by_kind,
      }));
    });
  }

  public createResetRule(
    context: RequestContext,
    input: CreateComplianceResetRuleRequest,
  ): Promise<ResetRule> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      // Idempotencia de referencia: regra ja existente nao gera bloco orfao.
      const existing = await client.query(
        `SELECT 1 FROM ops.compliance_reset_rules
          WHERE adjusted_kind = $1 AND adjusted_by_kind = $2`,
        [input.adjustedKind, input.adjustedByKind],
      );
      if (existing.rowCount !== null && existing.rowCount > 0) {
        return { adjustedKind: input.adjustedKind, adjustedByKind: input.adjustedByKind };
      }
      const blockId = randomUUID();
      await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.compliance_reset_rules',
        entityId: id,
        actionType: 'RESET_RULE_CREATED',
        payload: { ...input },
      });
      await client.query(
        `INSERT INTO ops.compliance_reset_rules(
           id, tenant_id, company_id, adjusted_kind, adjusted_by_kind, created_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          context.tenantId,
          context.companyId,
          input.adjustedKind,
          input.adjustedByKind,
          context.userId,
          blockId,
        ],
      );
      return { adjustedKind: input.adjustedKind, adjustedByKind: input.adjustedByKind };
    });
  }

  public createComplianceItem(
    context: RequestContext,
    aircraftId: string,
    input: CreateComplianceItemRequest,
  ): Promise<CreateComplianceItemResponse> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const draft: ComplianceItemRecord = {
        id,
        aircraftId,
        kind: input.kind,
        label: input.label,
        regulatory: input.regulatory ?? true,
        interval: {
          months: input.intervalMonths ?? null,
          hours: input.intervalHours ?? null,
          cycles: input.intervalCycles ?? null,
        },
        monthCounting: input.monthCounting ?? 'calendar',
        meter: input.meter ?? null,
        lastDoneDate: input.lastDoneDate ?? null,
        lastDoneHours: input.lastDoneHours ?? null,
        lastDoneCycles: input.lastDoneCycles ?? null,
        nextDueDate: null,
        nextDueHours: null,
        nextDueCycles: null,
        notes: input.notes ?? null,
      };
      const nextDue = computeNextDue(draft);
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.compliance_items',
        entityId: id,
        actionType: 'COMPLIANCE_ITEM_CREATED',
        payload: { aircraftId, ...input, nextDue },
      });
      const result = await client.query<ComplianceItemRow>(
        `INSERT INTO ops.compliance_items(
           id, tenant_id, company_id, aircraft_id, kind, label, regulatory,
           interval_months, interval_hours, interval_cycles, month_counting, meter,
           last_done_date, last_done_hours, last_done_cycles,
           next_due_date, next_due_hours, next_due_cycles, notes, created_by, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING ${ITEM_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId,
          aircraftId,
          draft.kind,
          draft.label,
          draft.regulatory,
          draft.interval.months,
          draft.interval.hours,
          draft.interval.cycles,
          draft.monthCounting,
          draft.meter,
          draft.lastDoneDate,
          draft.lastDoneHours,
          draft.lastDoneCycles,
          nextDue.date,
          nextDue.hours,
          nextDue.cycles,
          draft.notes,
          context.userId,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de item de conformidade nao retornou registro.');
      return { item: toComplianceItem(row), nextDue, ledgerBlockId: blockId, ledgerHash };
    });
  }

  public recordComplianceDone(
    context: RequestContext,
    input: RecordComplianceDoneRequest,
  ): Promise<RecordComplianceDoneResponse> {
    return this.database.withContext(context, async (client) => {
      const current = await client.query<ComplianceItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM ops.compliance_items WHERE id = $1`,
        [input.complianceItemId],
      );
      const row = current.rows[0];
      if (row === undefined) throw new Error('Item de conformidade nao encontrado.');
      const previous = toComplianceItem(row);
      const item: ComplianceItemRecord = {
        ...previous,
        lastDoneDate: input.doneDate,
        lastDoneHours: input.doneHours ?? previous.lastDoneHours,
        lastDoneCycles: input.doneCycles ?? previous.lastDoneCycles,
      };
      const nextDue = computeNextDue(item);
      const urgency = urgencyOf(
        nextDue,
        item.lastDoneHours,
        item.lastDoneCycles,
        new Date(),
        DEFAULT_THRESHOLDS,
      );
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'ops.compliance_items',
        entityId: input.complianceItemId,
        actionType: 'COMPLIANCE_ITEM_DONE',
        payload: { ...input, nextDue, urgency },
        changes: { before: previous, after: item },
      });
      // Protocolo eletronico da execucao, na MESMA transacao do dominio.
      const protocol = await this.protocol.issue(client, context, {
        entityType: 'ops.compliance_items',
        entityId: input.complianceItemId,
        ledgerBlockId: blockId,
      });
      const updated = await client.query<ComplianceItemRow>(
        `UPDATE ops.compliance_items SET
           last_done_date = $2, last_done_hours = $3, last_done_cycles = $4,
           next_due_date = $5, next_due_hours = $6, next_due_cycles = $7,
           updated_at = clock_timestamp(), ledger_block_id = $8
         WHERE id = $1
         RETURNING ${ITEM_COLUMNS}`,
        [
          input.complianceItemId,
          input.doneDate,
          item.lastDoneHours,
          item.lastDoneCycles,
          nextDue.date,
          nextDue.hours,
          nextDue.cycles,
          blockId,
        ],
      );
      const updatedRow = updated.rows[0];
      if (updatedRow === undefined) throw new Error('Atualizacao de conformidade nao retornou registro.');
      return {
        item: toComplianceItem(updatedRow),
        nextDue,
        urgency,
        ledgerBlockId: blockId,
        ledgerHash,
        protocolNumber: protocol.protocolNumber,
      };
    });
  }

  /** Aeronave de um item de conformidade (o evento de execucao nao a carrega). */
  public findComplianceItemAircraft(
    context: RequestContext,
    complianceItemId: string,
  ): Promise<string | null> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<{ aircraft_id: string }>(
        'SELECT aircraft_id FROM ops.compliance_items WHERE id = $1',
        [complianceItemId],
      );
      return result.rows[0]?.aircraft_id ?? null;
    });
  }

  /**
   * Projeta o estado corrente dos alertas de uma aeronave. A funcao
   * `SECURITY DEFINER` recebe os alertas ativos, faz upsert e resolve o que
   * saiu da condicao de urgencia: reprocessar a mesma mensagem converge para o
   * mesmo estado (idempotencia exigida pela entrega at-least-once).
   */
  public projectAlerts(
    context: RequestContext,
    input: {
      readonly aircraftId: string;
      readonly sourceEventId: string;
      readonly alerts: readonly AlertProjection[];
    },
  ): Promise<void> {
    return this.database.withContext(context, async (client) => {
      await client.query(
        'SELECT notifications.project_alerts($1, $2, $3, $4, $5::jsonb)',
        [
          context.tenantId,
          context.companyId ?? null,
          input.aircraftId,
          input.sourceEventId,
          JSON.stringify(input.alerts),
        ],
      );
    });
  }

  /** Alertas correntes (nao resolvidos) do tenant/empresa do contexto. */
  public listAlerts(context: RequestContext): Promise<AircraftAlert[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<AlertRow>(
        `SELECT id, aircraft_id, item_id, code, severity, urgency, title, detail, updated_at
           FROM notifications.alerts
          WHERE resolved_at IS NULL
          ORDER BY
            CASE severity WHEN 'BLOCKING' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
            updated_at DESC`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        aircraftId: row.aircraft_id,
        itemId: row.item_id,
        code: row.code,
        severity: row.severity,
        urgency: row.urgency,
        title: row.title,
        detail: row.detail,
        updatedAt: new Date(row.updated_at).toISOString(),
      }));
    });
  }
}
