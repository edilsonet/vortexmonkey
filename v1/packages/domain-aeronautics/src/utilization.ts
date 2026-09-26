/**
 * Taxa de utilizacao -> data projetada de vencimento.
 *
 * Portado do MyTailLog (MIT). Reescrito em TS estrito, sem dependencias.
 * A projecao e um PLANEJAMENTO, nunca uma determinacao de conformidade: o
 * limite por horas continua sendo o que vence; a data e aritmetica sobre o
 * ritmo recente da aeronave. Leitura estimada (ex.: derivada por ADSB ou por
 * ratio hobbs<->tach) nunca entra no calculo — seria circular.
 */

import type { Confidence, MeterReading, MeterReset, UtilizationMeter } from './types';

const DAY_MS = 86_400_000;
/** Janela movel de um ano: suaviza sazonalidade sem usar padrao antigo de operacao. */
export const WINDOW_DAYS = 365;

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

export interface Projection {
  readonly date: string;
  readonly confidence: Exclude<Confidence, 'none'>;
}

const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const parse = (d: string): number => Date.parse(`${d}T00:00:00Z`);

/**
 * Escada de confianca: as duas dimensoes precisam subir o degrau. Muitas
 * leituras em poucos dias nao revelam a taxa anual; duas leituras separadas por
 * um ano nao revelam se o voo foi regular.
 */
export function confidenceFor(sampleCount: number, spanDays: number): Confidence {
  if (sampleCount >= 6 && spanDays >= 180) return 'high';
  if (sampleCount >= 4 && spanDays >= 90) return 'medium';
  if (sampleCount >= 2 && spanDays >= 30) return 'low';
  return 'none';
}

function noRate(meter: UtilizationMeter, windowStart: string, windowEnd: string): Utilization {
  return {
    hoursPerDay: 0,
    sampleCount: 0,
    spanDays: 0,
    confidence: 'none',
    windowStart,
    windowEnd,
    meter,
  };
}

/**
 * Verdadeiro quando um reset declarado cai no intervalo (from, to].
 * `resetDate` e o PRIMEIRO dia na nova escala. O intervalo e descartado por
 * inteiro: costurar escalas antiga e nova infla ou zera a taxa.
 */
function spansReset(resets: readonly MeterReset[], meter: UtilizationMeter, from: string, to: string): boolean {
  return resets.some((r) => r.meter === meter && r.resetDate > from && r.resetDate <= to);
}

function meterValue(reading: MeterReading, meter: UtilizationMeter): number | null {
  return meter === 'tach' ? (reading.tach ?? null) : (reading.hobbs ?? null);
}

/** Taxa em UM medidor. Exportada para testes; o uso comum e `computeUtilization`. */
export function utilizationFor(
  readings: readonly MeterReading[],
  resets: readonly MeterReset[],
  meter: UtilizationMeter,
  today: Date = new Date(),
): Utilization {
  const endMs = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const windowEnd = iso(endMs);
  const windowStart = iso(endMs - WINDOW_DAYS * DAY_MS);

  const dated = readings
    .filter((r) => !r.estimated)
    .map((r) => ({ date: r.date, value: meterValue(r, meter) }))
    .filter((p): p is { date: string; value: number } => p.value != null)
    .filter((p) => p.date >= windowStart && p.date <= windowEnd)
    .sort((a, b) => a.date.localeCompare(b.date) || a.value - b.value);

  // Colapsa leituras do mesmo dia na maior: a leitura de fim de dia e a que
  // carrega o voo do dia; manter as duas gera intervalo de 0 dia.
  const pts: { date: string; value: number }[] = [];
  for (const p of dated) {
    const last = pts[pts.length - 1];
    if (last !== undefined && last.date === p.date) pts[pts.length - 1] = p;
    else pts.push(p);
  }
  if (pts.length < 2) return noRate(meter, windowStart, windowEnd);

  let hours = 0;
  let days = 0;
  const contributing = new Set<string>();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a === undefined || b === undefined) continue;
    if (spansReset(resets, meter, a.date, b.date)) continue;
    const delta = b.value - a.value;
    // Medidor nao anda para tras: sem reset declarado, e leitura ruim, nao voo
    // negativo. Descarta o intervalo e mantem o restante.
    if (delta < 0) continue;
    hours += delta;
    days += (parse(b.date) - parse(a.date)) / DAY_MS;
    contributing.add(a.date);
    contributing.add(b.date);
  }
  if (days <= 0 || contributing.size < 2) return noRate(meter, windowStart, windowEnd);

  const dates = [...contributing].sort();
  return {
    hoursPerDay: hours / days,
    sampleCount: contributing.size,
    spanDays: days,
    confidence: confidenceFor(contributing.size, days),
    windowStart: dates[0] ?? windowStart,
    windowEnd: dates[dates.length - 1] ?? windowEnd,
    meter,
  };
}

/** Taxa da aeronave, preferindo TACH; HOBBS apenas como alternativa. */
export function computeUtilization(
  readings: readonly MeterReading[],
  resets: readonly MeterReset[],
  today: Date = new Date(),
): Utilization {
  const tach = utilizationFor(readings, resets, 'tach', today);
  if (tach.confidence !== 'none') return tach;
  const hobbs = utilizationFor(readings, resets, 'hobbs', today);
  return hobbs.confidence !== 'none' ? hobbs : tach;
}

/**
 * Data em que `hoursRemaining` se esgota, no ritmo recente. Null quando nao ha
 * taxa confiavel ou o item ja venceu (projetar o passado nao informa nada).
 */
export function projectDueDate(
  hoursRemaining: number | null,
  utilization: Utilization,
  today: Date = new Date(),
): Projection | null {
  if (hoursRemaining == null || hoursRemaining <= 0) return null;
  if (utilization.confidence === 'none' || utilization.hoursPerDay <= 0) return null;
  const days = Math.round(hoursRemaining / utilization.hoursPerDay);
  if (!Number.isFinite(days)) return null;
  const endMs = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  return { date: iso(endMs + days * DAY_MS), confidence: utilization.confidence };
}

/** "14 mar 2027" — sem surpresa de locale no servidor. */
export function formatProjectedDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Texto inline da projecao: sempre o "≈" e sempre a confianca. */
export function projectionLabel(projection: Projection): string {
  return `≈ ${formatProjectedDate(projection.date)} (confianca ${projection.confidence})`;
}

/** Texto de detalhe: de onde veio a taxa e o que ela NAO e. */
export function projectionTitle(utilization: Utilization): string {
  const perMonth = Math.round(utilization.hoursPerDay * 30.4 * 10) / 10;
  return (
    'Estimativa de planejamento, nao determinacao de conformidade. ' +
    `Projetada a partir de ${perMonth} h/mes (${utilization.sampleCount} leituras de ` +
    `${utilization.meter} entre ${utilization.windowStart} e ${utilization.windowEnd}).`
  );
}
