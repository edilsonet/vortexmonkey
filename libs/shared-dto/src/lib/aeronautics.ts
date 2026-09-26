/**
 * Contratos de dominio aeronautico do VORTEX.
 *
 * Este arquivo contem apenas FORMAS (tipos e interfaces), sem comportamento.
 * Fica em `shared-dto` para que frontend (Angular) e backend (NestJS) concordem
 * sobre as mesmas formas sem que o frontend dependa do motor de calculo.
 * O comportamento (funcoes puras) vive em `@vortex/util-aeronautics`.
 *
 * Vocabulario regulatorio ANAC. Origem logica: MyTailLog (MIT) e SlingologyMX
 * (Apache-2.0), reescritos em TypeScript estrito.
 */

// ---------------------------------------------------------------------------
// Vencimento, urgencia e conformidade
// ---------------------------------------------------------------------------

/** Medidores de tempo de aeronave. */
export type Meter = 'tach' | 'hobbs' | 'airframe';

/** Medidores admitidos em projecao de utilizacao (celula excluida: sem relacao fixa). */
export type UtilizationMeter = Extract<Meter, 'tach' | 'hobbs'>;

/** Leitura de medidor registrada em uma data (YYYY-MM-DD). */
export interface MeterReading {
  readonly date: string;
  readonly tach?: number | null;
  readonly hobbs?: number | null;
  readonly airframe?: number | null;
  readonly estimated?: boolean;
}

/** Substituicao declarada de medidor: a partir de `resetDate` vale a nova escala. */
export interface MeterReset {
  readonly meter: UtilizationMeter;
  readonly resetDate: string;
}

/** Intervalo regulatorio ou de plano de manutencao. */
export interface Interval {
  readonly months?: number | null;
  readonly hours?: number | null;
  readonly cycles?: number | null;
}

/**
 * Como contar o intervalo em meses:
 * - `exact`    -> meses corridos exatos a partir da data;
 * - `calendar` -> ultimo dia do mes de vencimento (padrao "meses-calendario");
 * - `days30`   -> janela fixa de 30 dias.
 */
export type MonthCounting = 'exact' | 'calendar' | 'days30';

/** Item recorrente de conformidade (inspecao, DA, revisao, componente). */
export interface ComplianceItem {
  readonly id: string;
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

/** Proximo vencimento calculado. */
export interface NextDue {
  readonly date: string | null;
  readonly hours: number | null;
  readonly cycles: number | null;
}

/** Urgencia de um item frente ao vencimento. */
export type Urgency = 'overdue' | 'due_soon' | 'upcoming' | 'none';

/** Confianca de um calculo derivado de amostras. */
export type Confidence = 'high' | 'medium' | 'low' | 'none';

/** Regra de reset cruzado entre itens (ex.: inspecao periodica resetada por revisao geral). */
export interface ResetRule {
  readonly adjustedKind: string;
  readonly adjustedByKind: string;
}

/** Limiares de antecedencia para urgencia. */
export interface UrgencyThresholds {
  readonly dueSoonDays: number;
  readonly dueSoonHours: number;
  readonly dueSoonCycles: number;
}

/** Recorte de severidade usado pelo Hub de Alertas Preditivos. */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';

// ---------------------------------------------------------------------------
// Projecao de utilizacao
// ---------------------------------------------------------------------------

/** Taxa de utilizacao medida em um medidor. */
export interface Utilization {
  /** Media de horas voadas por dia-calendario na janela. 0 quando nao ha taxa. */
  readonly hoursPerDay: number;
  /** Leituras que contribuiram para a taxa (pos-exclusao de reset). */
  readonly sampleCount: number;
  /** Dias-calendario efetivamente medidos. */
  readonly spanDays: number;
  readonly confidence: Confidence;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly meter: UtilizationMeter;
}

/** Data projetada de vencimento. Planejamento, nunca determinacao de conformidade. */
export interface Projection {
  readonly date: string;
  readonly confidence: Exclude<Confidence, 'none'>;
}

// ---------------------------------------------------------------------------
// Peso e balanceamento (W&B)
// ---------------------------------------------------------------------------

export interface WBTriple {
  readonly weight: number | null;
  readonly arm: number | null;
  readonly moment: number | null;
}

export type EquipChangeKind = 'install' | 'removal';

export interface EquipChange {
  readonly name: string;
  readonly date: string;
  readonly kind: EquipChangeKind;
}

export type WBStatus = 'ok' | 'incomplete' | 'stale';

/** Avaliacao do registro de W&B de uma aeronave. */
export interface WBAssessment {
  readonly status: WBStatus;
  readonly missing: readonly (keyof WBTriple)[];
  readonly staleChanges: readonly EquipChange[];
}

// ---------------------------------------------------------------------------
// Medidores (contadores)
// ---------------------------------------------------------------------------

export type CounterValueType = 'actual' | 'interpolated' | 'extrapolated';
export type CounterConfidence = 'high' | 'low';

export interface CounterEntry {
  readonly date: string;
  readonly value: number;
}

/** Valor de medidor em uma data, com tipo e confianca. */
export interface CounterResult {
  readonly value: number;
  readonly type: CounterValueType;
  readonly confidence: CounterConfidence;
  readonly explanation: string;
}

export interface CounterLog {
  readonly entries: readonly CounterEntry[];
  readonly counterType: string;
}

/** Fonte bruta (linha de historico): pode trazer varios medidores por data. */
export interface RawCounterRow {
  readonly changeDate: string;
  readonly value: number | null;
}

export type CounterKey = 'hobbs' | 'tach' | 'airframe';

export interface CounterUpdate {
  readonly hobbs?: number;
  readonly tach?: number;
  readonly airframe?: number;
}

export interface CounterValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/** Ritmo de uso (horas/dia) medido em uma janela. */
export interface UsageRate {
  readonly rate: number;
  readonly windowDays: number;
  readonly confidence: CounterConfidence;
}

// ---------------------------------------------------------------------------
// Rateio (amortizacao) de custo
// ---------------------------------------------------------------------------

export type AmortizationBasis = 'time' | 'usage';
export type AmortizationConfidence = 'high' | 'low';

export interface TimeBasedAmortization {
  readonly basis: 'time';
  readonly totalCost: number;
  readonly startDate: string;
  readonly endDate: string;
}

export interface UsageBasedAmortization {
  readonly basis: 'usage';
  readonly totalCost: number;
  readonly startCounterValue: number;
  readonly endCounterValue: number;
}

export type AmortizationConfig = TimeBasedAmortization | UsageBasedAmortization;

export interface AmortizationResult {
  readonly amortizedCost: number;
  readonly ratePerDay?: number;
  readonly ratePerUnit?: number;
  readonly explanation: string;
  readonly confidence: AmortizationConfidence;
  readonly isPartial: boolean;
}

/** Taxa do rateio, por dia-calendario ou por hora de medidor. */
export interface AmortizationRate {
  readonly rate: number;
  readonly unit: 'dia' | 'hora';
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

/** Sinal pronto para o Hub de Alertas Preditivos (badges da Shell). */
export interface ComplianceAlertSignal {
  readonly itemId: string;
  readonly kind: string;
  readonly severity: AlertSeverity;
  readonly urgency: Urgency;
  readonly advanceDays: number | null;
  readonly advanceHours: number | null;
  readonly message: string;
}
