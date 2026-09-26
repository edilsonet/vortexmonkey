/**
 * @vortex/domain-aeronautics
 *
 * Biblioteca PURA de dominio aeronautico do VORTEX: vencimento e urgencia,
 * projecao de utilizacao, medidores, peso e balanceamento e rateio de custo.
 *
 * Regras de uso:
 * - Nao depende de framework, banco ou HTTP. Recebe dados carregados e calcula.
 * - Nao emite documento nem decide conformidade: prepara e sinaliza. A emissao
 *   (CRS, SEGVOO, W&B assinado) e ato do responsavel tecnico.
 * - Consumida pelo backend NestJS (apps/api) e pelas libs do workspace Nx.
 *
 * Origem da logica: MyTailLog (MIT) e SlingologyMX (Apache-2.0), portadas e
 * reescritas em TypeScript estrito para o vocabulario regulatorio ANAC.
 */

export type {
  Meter,
  UtilizationMeter,
  MeterReading,
  MeterReset,
  Interval,
  MonthCounting,
  ComplianceItem,
  NextDue,
  Urgency,
  Confidence,
  ResetRule,
  UrgencyThresholds,
  AlertSeverity,
} from './types';

export {
  DEFAULT_THRESHOLDS,
  DUE_SOON_DAYS_BY_KIND,
  URGENCY_RANK,
  addDays,
  addMonths,
  calendarMonthsDue,
  cyclesRemaining,
  daysUntil,
  dueText,
  dueSoonDaysForKind,
  effectiveNextDue,
  hoursRemaining,
  nextDueFrom,
  normalizeInterval,
  round1,
  urgencyOf,
} from './dueness';

export {
  WINDOW_DAYS,
  computeUtilization,
  confidenceFor,
  formatProjectedDate,
  projectDueDate,
  projectionLabel,
  projectionTitle,
  utilizationFor,
  type Projection,
  type Utilization,
} from './utilization';

export {
  assessWB,
  completeWB,
  staleWBChanges,
  usefulLoad,
  type EquipChange,
  type EquipChangeKind,
  type WBTriple,
  type WBStatus,
} from './weightBalance';

export {
  calculateUsageRate,
  getCounterValue,
  getOwnerHours,
  normalizeCounterLog,
  validateCounterUpdate,
  type CounterConfidence,
  type CounterEntry,
  type CounterKey,
  type CounterLog,
  type CounterResult,
  type CounterUpdate,
  type CounterValidation,
  type CounterValueType,
  type RawCounterRow,
} from './counter';

export {
  calculateAmortization,
  calculateTimeBasedAmortization,
  calculateUsageBasedAmortization,
  getAmortizationRate,
  validateAmortizationConfig,
  type AmortizationBasis,
  type AmortizationConfidence,
  type AmortizationConfig,
  type AmortizationResult,
  type TimeBasedAmortization,
  type UsageBasedAmortization,
} from './amortization';

export {
  SEVERITY_BY_URGENCY,
  toAlertSignal,
  type ComplianceAlertSignal,
} from './alerts';
