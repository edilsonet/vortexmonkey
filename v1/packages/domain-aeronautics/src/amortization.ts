/**
 * Rateio (amortizacao) de custo por tempo ou por uso.
 *
 * Portado do SlingologyMX (Apache-2.0), reescrito em TS estrito. Serve ao
 * financeiro/contabilidade do ERP Manutencao: uma revisao geral de custo alto
 * deve ser rateada no periodo ou nas horas que ela cobre, nao lancada no mes do
 * pagamento. O rateio por uso exige o log de medidor para estimar o valor
 * consumido no periodo.
 */

import { getCounterValue, type CounterLog } from './counter';

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

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const fmt = (d: string): string =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Valida a configuracao de rateio. Devolve a mensagem de erro ou null se valida. */
export function validateAmortizationConfig(config: AmortizationConfig): string | null {
  if (config.totalCost <= 0) return 'O custo total deve ser positivo.';
  if (config.basis === 'time') {
    if (config.startDate === '' || config.endDate === '') {
      return 'Datas de inicio e fim sao obrigatorias no rateio por tempo.';
    }
    if (config.endDate <= config.startDate) return 'A data final deve ser posterior a inicial.';
  } else {
    if (config.endCounterValue <= config.startCounterValue) {
      return 'O valor final do medidor deve ser maior que o inicial.';
    }
  }
  return null;
}

/** Taxa do rateio: por dia ou por hora. Null se a configuracao for invalida. */
export function getAmortizationRate(
  config: AmortizationConfig,
): { readonly rate: number; readonly unit: 'dia' | 'hora' } | null {
  if (validateAmortizationConfig(config) != null) return null;
  if (config.basis === 'time') {
    return { rate: config.totalCost / daysBetween(config.startDate, config.endDate), unit: 'dia' };
  }
  return {
    rate: config.totalCost / (config.endCounterValue - config.startCounterValue),
    unit: 'hora',
  };
}

export function calculateTimeBasedAmortization(
  config: TimeBasedAmortization,
  analysisStart: string,
  analysisEnd: string,
): AmortizationResult | null {
  if (validateAmortizationConfig(config) != null) return null;

  const overlapStart = config.startDate > analysisStart ? config.startDate : analysisStart;
  const overlapEnd = config.endDate < analysisEnd ? config.endDate : analysisEnd;
  if (overlapStart >= overlapEnd) {
    return {
      amortizedCost: 0,
      ratePerDay: 0,
      explanation: 'Sem sobreposicao com o periodo analisado.',
      confidence: 'high',
      isPartial: false,
    };
  }

  const totalDays = daysBetween(config.startDate, config.endDate);
  const overlapDays = daysBetween(overlapStart, overlapEnd);
  const ratePerDay = config.totalCost / totalDays;
  return {
    amortizedCost: round2(ratePerDay * overlapDays),
    ratePerDay: round2(ratePerDay),
    explanation: `Rateado em ${totalDays} dias (${fmt(overlapStart)} a ${fmt(overlapEnd)}).`,
    confidence: 'high',
    isPartial: overlapDays < totalDays,
  };
}

export function calculateUsageBasedAmortization(
  config: UsageBasedAmortization,
  analysisStart: string,
  analysisEnd: string,
  counterLog: CounterLog,
): AmortizationResult | null {
  if (validateAmortizationConfig(config) != null) return null;

  const startCounter = getCounterValue(counterLog, analysisStart);
  const endCounter = getCounterValue(counterLog, analysisEnd);
  if (startCounter == null || endCounter == null) return null;

  const effectiveStart = Math.max(startCounter.value, config.startCounterValue);
  const effectiveEnd = Math.min(endCounter.value, config.endCounterValue);
  if (effectiveStart >= effectiveEnd) {
    return {
      amortizedCost: 0,
      ratePerUnit: 0,
      explanation: 'Sem sobreposicao de uso com o periodo analisado.',
      confidence: 'high',
      isPartial: false,
    };
  }

  const totalUnits = config.endCounterValue - config.startCounterValue;
  const consumed = effectiveEnd - effectiveStart;
  const ratePerUnit = config.totalCost / totalUnits;
  const extrapolated =
    startCounter.type === 'extrapolated' || endCounter.type === 'extrapolated';
  return {
    amortizedCost: round2(ratePerUnit * consumed),
    ratePerUnit: round2(ratePerUnit),
    explanation: `Rateado em ${totalUnits} horas (${consumed.toFixed(1)} h no periodo).`,
    confidence: extrapolated ? 'low' : 'high',
    isPartial: consumed < totalUnits,
  };
}

/** Dispatcher: usa o medidor quando o rateio for por uso. */
export function calculateAmortization(
  config: AmortizationConfig,
  analysisStart: string,
  analysisEnd: string,
  counterLog?: CounterLog,
): AmortizationResult | null {
  if (config.basis === 'time') {
    return calculateTimeBasedAmortization(config, analysisStart, analysisEnd);
  }
  if (counterLog == null) return null;
  return calculateUsageBasedAmortization(config, analysisStart, analysisEnd, counterLog);
}
