/**
 * @vortex/util-aeronautics
 *
 * Motor PURO de dominio aeronautico do VORTEX: vencimento e urgencia, projecao
 * de utilizacao, medidores, peso e balanceamento e rateio de custo.
 *
 * Regras de uso:
 * - Nao depende de framework, banco ou HTTP. Recebe dados carregados e calcula.
 * - As FORMAS (contratos) vivem em `@vortex/shared-dto`; aqui vive o COMPORTAMENTO.
 * - Nao emite documento nem decide conformidade: prepara e sinaliza. A emissao
 *   (CRS, SEGVOO, W&B assinado) e ato do responsavel tecnico.
 */

export {
  DEFAULT_THRESHOLDS,
  DUE_SOON_DAYS_BY_KIND,
  URGENCY_RANK,
  addDays,
  addMonths,
  calendarMonthsDue,
  cyclesRemaining,
  daysUntil,
  dueSoonDaysForKind,
  dueText,
  effectiveNextDue,
  hoursRemaining,
  nextDueFrom,
  normalizeInterval,
  round1,
  urgencyOf,
} from './lib/dueness';

export {
  WINDOW_DAYS,
  computeUtilization,
  confidenceFor,
  formatProjectedDate,
  projectDueDate,
  projectionLabel,
  projectionTitle,
  utilizationFor,
} from './lib/utilization';

export { assessWB, completeWB, staleWBChanges, usefulLoad } from './lib/weightBalance';

export {
  calculateUsageRate,
  getCounterValue,
  getOwnerHours,
  normalizeCounterLog,
  validateCounterUpdate,
} from './lib/counter';

export {
  calculateAmortization,
  calculateTimeBasedAmortization,
  calculateUsageBasedAmortization,
  getAmortizationRate,
  validateAmortizationConfig,
} from './lib/amortization';

export { SEVERITY_BY_URGENCY, toAlertSignal } from './lib/alerts';
