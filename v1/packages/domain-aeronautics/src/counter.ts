/**
 * Medidores de tempo: interpolacao, extrapolacao e validacao.
 *
 * Portado do SlingologyMX (Apache-2.0), reescrito em TS estrito e desacoplado
 * do Supabase. A regra central e que medidores hobbs/tach sao MONOTONICOS:
 * qualquer valor que recue e leitura ruim ou reset de escala, nunca voo
 * negativo. O resultado sempre carrega tipo (actual/interpolated/extrapolated)
 * e confianca, porque alimenta projecao e rateio de custo.
 */

import { addDays } from './dueness';

export type CounterValueType = 'actual' | 'interpolated' | 'extrapolated';
export type CounterConfidence = 'high' | 'low';

export interface CounterEntry {
  readonly date: string;
  readonly value: number;
}

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

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const fmt = (d: string): string =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Normaliza as linhas brutas em um log: descarta valores nulos, colapsa datas
 * repetidas mantendo o MAIOR valor (o medidor so cresce; o maior e o efetivo) e
 * ordena por data. Aceita o formato `changeDate` de texto com hora.
 */
export function normalizeCounterLog(
  rows: readonly RawCounterRow[],
  counterType: string,
): CounterLog {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.value == null) continue;
    const date = row.changeDate.slice(0, 10);
    const current = byDate.get(date);
    if (current === undefined || row.value > current) byDate.set(date, row.value);
  }
  const entries = [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { entries, counterType };
}

/**
 * Valor do medidor em qualquer data: exato, interpolado entre vizinhos,
 * extrapolado pelo ritmo recente, ou a primeira leitura disponivel quando a
 * data antecede o historico (permite calculo de periodo parcial).
 */
export function getCounterValue(
  log: CounterLog,
  analysisDate: string,
  lookbackDays = 90,
): CounterResult | null {
  const { entries } = log;
  if (entries.length === 0) return null;

  const first = entries[0];
  const last = entries[entries.length - 1];
  if (first === undefined || last === undefined) return null;

  if (analysisDate < first.date) {
    return {
      value: first.value,
      type: 'interpolated',
      confidence: 'low',
      explanation: `Valor mais antigo disponivel de ${fmt(first.date)} (a data analisada antecede o historico).`,
    };
  }
  if (analysisDate > last.date) return extrapolateForward(entries, analysisDate, lookbackDays);
  return interpolateBetween(entries, analysisDate);
}

function interpolateBetween(
  entries: readonly CounterEntry[],
  targetDate: string,
): CounterResult | null {
  let before: CounterEntry | null = null;
  let after: CounterEntry | null = null;
  for (const entry of entries) {
    if (entry.date <= targetDate) before = entry;
    else {
      after = entry;
      break;
    }
  }
  if (before == null) return null;
  if (before.date === targetDate) {
    return {
      value: before.value,
      type: 'actual',
      confidence: 'high',
      explanation: `Valor real registrado em ${fmt(targetDate)}.`,
    };
  }
  if (after == null) return null;
  if (after.value < before.value) return null;

  const totalDays = daysBetween(before.date, after.date);
  if (totalDays === 0) {
    return {
      value: after.value,
      type: 'actual',
      confidence: 'high',
      explanation: `Valor real registrado em ${fmt(after.date)}.`,
    };
  }
  const rate = (after.value - before.value) / totalDays;
  const value = before.value + rate * daysBetween(before.date, targetDate);
  return {
    value: round1(value),
    type: 'interpolated',
    confidence: totalDays > 180 ? 'low' : 'high',
    explanation: `Interpolado entre ${fmt(before.date)} e ${fmt(after.date)}.`,
  };
}

function extrapolateForward(
  entries: readonly CounterEntry[],
  targetDate: string,
  lookbackDays: number,
): CounterResult | null {
  if (entries.length < 2) return null;
  const last = entries[entries.length - 1];
  if (last == null) return null;

  const cutoff = addDays(last.date, -lookbackDays);
  const window = entries.filter((e) => e.date >= cutoff);
  const sample = window.length >= 2 ? window : entries.slice(-2);
  const first = sample[0];
  const lastSample = sample[sample.length - 1];
  if (first == null || lastSample == null) return null;

  const rateDays = daysBetween(first.date, lastSample.date);
  if (rateDays === 0) return null;
  const rate = (lastSample.value - first.value) / rateDays;
  const value = last.value + rate * daysBetween(last.date, targetDate);
  return {
    value: round1(value),
    type: 'extrapolated',
    confidence: rate <= 0 ? 'low' : 'high',
    explanation: `Projetado usando o uso medio dos ultimos ${rateDays} dias.`,
  };
}

/**
 * Ritmo de uso (horas/dia) do log. Usa a janela de lookback; se ela tiver menos
 * de duas leituras, cai para as duas ultimas. Null se nao houver base.
 */
export function calculateUsageRate(
  log: CounterLog,
  lookbackDays = 90,
): { readonly rate: number; readonly windowDays: number; readonly confidence: CounterConfidence } | null {
  const { entries } = log;
  if (entries.length < 2) return null;
  const last = entries[entries.length - 1];
  if (last == null) return null;

  const cutoff = addDays(last.date, -lookbackDays);
  const window = entries.filter((e) => e.date >= cutoff);
  const sample = window.length >= 2 ? window : entries.slice(-2);
  const first = sample[0];
  const lastSample = sample[sample.length - 1];
  if (first == null || lastSample == null) return null;

  const windowDays = daysBetween(first.date, lastSample.date);
  if (windowDays === 0) return null;
  const rate = (lastSample.value - first.value) / windowDays;
  return { rate, windowDays, confidence: rate <= 0 ? 'low' : 'high' };
}

/** Horas de propriedade do dono atual = valor absoluto menos o valor de aquisicao. */
export function getOwnerHours(absoluteValue: number, initialValue: number | null): number {
  const offset = initialValue ?? 0;
  return Math.max(0, absoluteValue - offset);
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

const COUNTER_LABEL: Readonly<Record<CounterKey, string>> = {
  hobbs: 'Hobbs',
  tach: 'Tach',
  airframe: 'Celula (TT)',
};

/**
 * Valida uma atualizacao de medidor contra o historico existente.
 *
 * - Lancamento em/pos a ultima leitura: o novo valor deve ser >= o ultimo.
 * - Lancamento retroativo entre leituras: o novo valor deve ficar entre as
 *   leituras anterior e posterior (ou ate a leitura do mesmo dia).
 *
 * Devolve erro explicativo em PT-BR; nunca lanca excecao.
 */
export function validateCounterUpdate(
  history: readonly CounterEntry[],
  maintenanceDate: string,
  updates: CounterUpdate,
): CounterValidation {
  const errors: string[] = [];
  if (history.length === 0) return { isValid: true, errors };

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  if (latest == null) return { isValid: true, errors };

  const keys = Object.keys(updates) as CounterKey[];
  for (const key of keys) {
    const newValue = updates[key];
    if (newValue === undefined) continue;

    if (maintenanceDate >= latest.date) {
      if (newValue < latest.value) {
        errors.push(
          `${COUNTER_LABEL[key]}: valor ${newValue} e menor que a ultima leitura registrada ` +
            `(${latest.value} em ${fmt(latest.date)}). Deve ser >= ${latest.value}.`,
        );
      }
      continue;
    }

    const before = [...sorted].reverse().find((e) => e.date < maintenanceDate) ?? null;
    const sameDay = sorted.find((e) => e.date === maintenanceDate) ?? null;
    const after = sorted.find((e) => e.date > maintenanceDate) ?? null;

    const lower = before?.value ?? 0;
    const upper = sameDay?.value ?? after?.value ?? Number.POSITIVE_INFINITY;

    if (newValue < lower || newValue > upper) {
      const lowerLabel = before ? fmt(before.date) : 'inicio';
      if (upper === Number.POSITIVE_INFINITY) {
        errors.push(
          `${COUNTER_LABEL[key]}: valor ${newValue} deve ser >= ${lower} (registrado em ${lowerLabel}).`,
        );
      } else {
        const upperLabel = sameDay ? fmt(sameDay.date) : after ? fmt(after.date) : 'fim';
        errors.push(
          `${COUNTER_LABEL[key]}: valor ${newValue} fora da faixa valida. ` +
            `Deve estar entre ${lower} (${lowerLabel}) e ${upper} (${upperLabel}).`,
        );
      }
    }
  }
  return { isValid: errors.length === 0, errors };
}
