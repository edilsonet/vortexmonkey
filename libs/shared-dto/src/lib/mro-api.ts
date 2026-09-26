/**
 * Contratos HTTP do ERP Manutencao (RBAC 43/145) expostos por `ops-mro`.
 *
 * Cada rota devolve `ApiResponse<T>` (ver `envelope.ts`). Datas sao strings
 * ISO `YYYY-MM-DD`; ausentes significam "hoje" no fuso do servidor.
 */

import type {
  AlertSeverity,
  AmortizationConfig,
  AmortizationResult,
  ComplianceAlertSignal,
  ComplianceItem,
  CounterEntry,
  CounterLog,
  CounterResult,
  CounterUpdate,
  CounterValidation,
  EquipChange,
  Interval,
  Meter,
  MeterReading,
  MeterReset,
  MonthCounting,
  NextDue,
  Projection,
  RawCounterRow,
  ResetRule,
  Urgency,
  UrgencyThresholds,
  Utilization,
  UtilizationMeter,
  WBAssessment,
  WBTriple,
} from './aeronautics';

// ---------------------------------------------------------------------------
// Conformidade (vencimento + urgencia + alerta + projecao)
// ---------------------------------------------------------------------------

/**
 * Alerta corrente do Hub Preditivo, projetado pelo consumidor de eventos.
 *
 * E estado derivado do ledger (um alerta por item de conformidade), nao
 * historico: por isso nao carrega a cadeia, apenas a condicao atual.
 */
export interface AircraftAlert {
  readonly id: string;
  readonly aircraftId: string;
  readonly itemId: string;
  readonly code: string;
  readonly severity: AlertSeverity;
  readonly urgency: Urgency;
  readonly title: string;
  readonly detail: string | null;
  readonly updatedAt: string;
}

export interface ComplianceAssessRequest {
  readonly items: readonly ComplianceItem[];
  readonly resetRules?: readonly ResetRule[];
  readonly currentHours?: number | null;
  readonly currentCycles?: number | null;
  readonly thresholds?: UrgencyThresholds;
  /** Data de referencia `YYYY-MM-DD`. Ausente = hoje. */
  readonly today?: string;
  /** Utilizacao ja calculada; habilita a projecao por item. */
  readonly utilization?: Utilization;
}

export interface ComplianceAssessment {
  readonly itemId: string;
  readonly kind: string;
  readonly label: string;
  readonly nextDue: NextDue;
  readonly urgency: Urgency;
  readonly dueText: string | null;
  readonly alert: ComplianceAlertSignal | null;
  readonly projection: Projection | null;
}

export interface ComplianceAssessResponse {
  readonly today: string;
  readonly worstUrgency: Urgency;
  readonly items: readonly ComplianceAssessment[];
}

// ---------------------------------------------------------------------------
// Utilizacao
// ---------------------------------------------------------------------------

export interface UtilizationRequest {
  readonly readings: readonly MeterReading[];
  readonly resets?: readonly MeterReset[];
  /** Data de referencia `YYYY-MM-DD`. Ausente = hoje. */
  readonly today?: string;
  /** Horas restantes ate o vencimento; habilita a projecao. */
  readonly hoursRemaining?: number | null;
}

export interface UtilizationResponse {
  readonly utilization: Utilization;
  readonly hoursPerMonth: number;
  readonly projection: Projection | null;
  readonly projectionLabel: string | null;
  readonly projectionTitle: string;
}

// ---------------------------------------------------------------------------
// Peso e balanceamento
// ---------------------------------------------------------------------------

export interface WBAssessRequest {
  readonly triple: WBTriple;
  readonly latestWBDate: string | null;
  readonly changes: readonly EquipChange[];
}

export interface WBAssessResponse {
  readonly assessment: WBAssessment;
  /** Tripla com o campo ausente derivado, quando possivel. */
  readonly completed: WBTriple;
}

// ---------------------------------------------------------------------------
// Medidores
// ---------------------------------------------------------------------------

export interface CounterValueRequest {
  readonly rows: readonly RawCounterRow[];
  readonly counterType: string;
  readonly analysisDate: string;
  readonly lookbackDays?: number;
}

export interface CounterValidateRequest {
  readonly history: readonly CounterEntry[];
  readonly maintenanceDate: string;
  readonly updates: CounterUpdate;
}

export type CounterValueResponse = CounterResult | null;
export type CounterValidateResponse = CounterValidation;

// ---------------------------------------------------------------------------
// Rateio de custo
// ---------------------------------------------------------------------------

export interface AmortizationRequest {
  readonly config: AmortizationConfig;
  readonly analysisStart: string;
  readonly analysisEnd: string;
  /** Obrigatorio quando `config.basis === 'usage'`. */
  readonly counterLog?: CounterLog;
}

export type AmortizationResponse = AmortizationResult | null;

// ---------------------------------------------------------------------------
// Persistencia: registros e requisicoes de escrita
// ---------------------------------------------------------------------------

/** Ancoragem obrigatoria no ledger: todo registro cita seu bloco. */
export interface LedgerAnchor {
  readonly ledgerBlockId: string;
  readonly ledgerHash: string;
}

export interface AircraftRecord {
  readonly id: string;
  readonly registration: string;
  readonly model: string;
  readonly manufacturer: string;
  readonly serialNumber: string | null;
  readonly totalHours: number;
  readonly totalCycles: number;
  readonly airworthinessStatus: string;
}

export interface MeterReadingRecord {
  readonly id: string;
  readonly aircraftId: string;
  readonly readingDate: string;
  readonly tach: number | null;
  readonly hobbs: number | null;
  readonly airframe: number | null;
  readonly estimated: boolean;
  readonly source: string | null;
  readonly notes: string | null;
}

/**
 * Reset declarado de medidor: a partir de `resetDate` o medidor vale em nova
 * escala. A taxa de utilização descarta qualquer intervalo que cruze o reset.
 */
export interface MeterResetRecord {
  readonly id: string;
  readonly aircraftId: string;
  readonly meter: UtilizationMeter;
  readonly resetDate: string;
  readonly notes: string | null;
}

export interface ComplianceItemRecord {
  readonly id: string;
  readonly aircraftId: string;
  readonly kind: string;
  readonly label: string;
  readonly regulatory: boolean;
  readonly interval: Interval;
  readonly monthCounting: MonthCounting;
  readonly meter: Meter | null;
  readonly lastDoneDate: string | null;
  readonly lastDoneHours: number | null;
  readonly lastDoneCycles: number | null;
  readonly nextDueDate: string | null;
  readonly nextDueHours: number | null;
  readonly nextDueCycles: number | null;
  readonly notes: string | null;
}

export interface CreateAircraftRequest {
  readonly registration: string;
  readonly model: string;
  readonly manufacturer: string;
  readonly serialNumber?: string | null;
  readonly totalHours?: number;
  readonly totalCycles?: number;
}

export interface RecordMeterReadingRequest {
  readonly readingDate: string;
  readonly tach?: number | null;
  readonly hobbs?: number | null;
  readonly airframe?: number | null;
  readonly estimated?: boolean;
  readonly source?: string | null;
  readonly notes?: string | null;
}

export interface CreateComplianceItemRequest {
  readonly kind: string;
  readonly label: string;
  readonly regulatory?: boolean;
  readonly intervalMonths?: number | null;
  readonly intervalHours?: number | null;
  readonly intervalCycles?: number | null;
  readonly monthCounting?: MonthCounting;
  readonly meter?: Meter | null;
  readonly lastDoneDate?: string | null;
  readonly lastDoneHours?: number | null;
  readonly lastDoneCycles?: number | null;
  readonly notes?: string | null;
}

export interface CreateComplianceResetRuleRequest {
  readonly adjustedKind: string;
  readonly adjustedByKind: string;
}

export interface RecordComplianceDoneRequest {
  readonly complianceItemId: string;
  readonly doneDate: string;
  readonly doneHours?: number | null;
  readonly doneCycles?: number | null;
}

export interface CreateAircraftResponse extends LedgerAnchor {
  readonly aircraft: AircraftRecord;
}

export interface RecordMeterReadingResponse extends LedgerAnchor {
  readonly reading: MeterReadingRecord;
}

export interface CreateMeterResetRequest {
  readonly meter: UtilizationMeter;
  readonly resetDate: string;
  readonly notes?: string | null;
}

export interface CreateMeterResetResponse extends LedgerAnchor {
  readonly reset: MeterResetRecord;
}

export interface CreateComplianceItemResponse extends LedgerAnchor {
  readonly item: ComplianceItemRecord;
  readonly nextDue: NextDue;
}

export interface RecordComplianceDoneResponse extends LedgerAnchor {
  readonly item: ComplianceItemRecord;
  readonly nextDue: NextDue;
  readonly urgency: Urgency;
  /** Protocolo eletronico `AAAA-NNNNNN` da execucao (Resolucao ANAC 520/2019). */
  readonly protocolNumber: string;
}

/** Avaliacao calculada a partir dos dados PERSISTIDOS da aeronave. */
export interface AircraftComplianceResponse extends ComplianceAssessResponse {
  readonly aircraftId: string;
  readonly utilization: Utilization | null;
}

// ---------------------------------------------------------------------------
// Saude
// ---------------------------------------------------------------------------

export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
}

/** Estado do outbox transacional (fila de eventos ainda nao publicados). */
export interface OutboxMetrics {
  readonly pending: number;
  readonly abandoned: number;
  readonly published: number;
  readonly oldestPendingAt: string | null;
  readonly lagSeconds: number | null;
  readonly maxPendingAttempts: number;
}

/** Estado da inbox de um consumidor (deduplicacao e dead-letter). */
export interface ConsumerMetrics {
  readonly consumer: string;
  readonly processed: number;
  readonly failed: number;
  readonly dead: number;
  readonly processing: number;
}

export interface BusMetrics {
  readonly outbox: OutboxMetrics;
  readonly consumer: ConsumerMetrics;
  readonly alarms: readonly BusAlarm[];
}

/** Alarme corrente do monitor do bus (uma linha aberta por `code`). */
export interface BusAlarm {
  readonly code: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly context: Record<string, unknown> | null;
  readonly openedAt: string;
  readonly updatedAt: string;
}

/** Resultado de um re-drive de eventos abandonados. */
export interface OutboxRedriveRequest {
  readonly ids?: readonly string[];
  readonly limit?: number;
}

export interface OutboxRedriveResponse {
  readonly redriven: readonly string[];
}
