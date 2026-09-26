/**
 * Calculo de vencimento e urgencia.
 *
 * Portado do motor de conformidade do MyTailLog (MIT), reescrito em TypeScript
 * estrito e sem dependencias. Regras-chave preservadas:
 * - meses-calendario vencem no ULTIMO dia do mes (nao no dia da assinatura);
 * - janela fixa de 30 dias para itens que a norma conta em dias;
 * - vencimento por horas/ciclos compara na MESMA escala do item;
 * - reset cruzado (ex.: inspecao de 100 horas resetada pela revisao geral).
 */

import type {
  ComplianceItem,
  Interval,
  NextDue,
  ResetRule,
  Urgency,
  UrgencyThresholds,
} from './types';

const DAY_MS = 86_400_000;

/** Limiares padrao (ajustaveis pelo chamador / por parametro regulatorio). */
export const DEFAULT_THRESHOLDS: UrgencyThresholds = {
  dueSoonDays: 90,
  dueSoonHours: 10,
  dueSoonCycles: 1,
};

/**
 * Antecedencia em dias por tipo de item. A maioria usa o padrao; itens de
 * verificacao de curto ciclo (ex.: checagem VOR/ILS do RBAC 91) exigem janela
 * curta, senao o alerta perde valor pratico.
 */
export const DUE_SOON_DAYS_BY_KIND: Readonly<Record<string, number>> = {
  VOR: 5,
  ILS: 5,
  CHECK_VOR_ILS: 5,
};

export function dueSoonDaysForKind(kind: string, fallback = DEFAULT_THRESHOLDS.dueSoonDays): number {
  return DUE_SOON_DAYS_BY_KIND[kind.toUpperCase()] ?? fallback;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Soma dias inteiros a uma data ISO (YYYY-MM-DD), em UTC. */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Soma meses corridos exatos. Mantem o comportamento do `setUTCMonth`
 * (dia inexistente transborda para o mes seguinte), usado para itens cujo
 * intervalo NAO e contado em meses-calendario.
 */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Vencimento em meses-calendario: ultimo dia do mes de vencimento.
 * O dia do mes da ultima execucao e irrelevante (norma conta meses-calendario).
 */
export function calendarMonthsDue(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const endOfDueMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0));
  return endOfDueMonth.toISOString().slice(0, 10);
}

/** Proximo vencimento a partir da ultima execucao + intervalo do item. */
export function nextDueFrom(item: ComplianceItem): NextDue {
  const { months, hours, cycles } = item.interval;
  const date =
    item.lastDoneDate != null && months != null
      ? item.monthCounting === 'days30'
        ? addDays(item.lastDoneDate, 30)
        : item.monthCounting === 'calendar'
          ? calendarMonthsDue(item.lastDoneDate, months)
          : addMonths(item.lastDoneDate, months)
      : null;
  const dueHours =
    item.lastDoneHours != null && hours != null ? round1(item.lastDoneHours + hours) : null;
  const dueCycles =
    item.lastDoneCycles != null && cycles != null ? item.lastDoneCycles + cycles : null;
  return { date, hours: dueHours, cycles: dueCycles };
}

/**
 * Vencimento efetivo considerando reset cruzado entre itens.
 *
 * Exemplo: a inspecao periodica de horas vence N horas depois do MAIS TARDE
 * entre a ultima inspecao periodica e a ultima revisao geral (a revisao reseta
 * o relogio). Sem regra aplicavel, devolve o vencimento do proprio item.
 */
export function effectiveNextDue(
  item: ComplianceItem,
  allItems: readonly ComplianceItem[],
  resetRules: readonly ResetRule[],
): NextDue {
  const own = { date: item.nextDueDate, hours: item.nextDueHours, cycles: item.nextDueCycles };
  const rule = resetRules.find((r) => r.adjustedKind === item.kind);
  if (rule === undefined || item.interval.hours == null) return own;

  const contributors = allItems.filter((i) => i.kind === rule.adjustedByKind);
  const bases: number[] = [];
  if (item.lastDoneHours != null) bases.push(item.lastDoneHours);
  for (const c of contributors) if (c.lastDoneHours != null) bases.push(c.lastDoneHours);
  if (bases.length === 0) return own;

  return {
    date: own.date,
    hours: round1(Math.max(...bases) + item.interval.hours),
    cycles: own.cycles,
  };
}

/** Dias inteiros de hoje ate a data (negativo = vencido). */
export function daysUntil(dateISO: string | null, today: Date = new Date()): number | null {
  if (dateISO == null) return null;
  const target = Date.parse(`${dateISO}T00:00:00Z`);
  const base = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((target - base) / DAY_MS);
}

/** Horas restantes ate o vencimento por horas (negativo = vencido). */
export function hoursRemaining(nextDueHours: number | null, currentHours: number | null): number | null {
  if (nextDueHours == null || currentHours == null) return null;
  return round1(nextDueHours - currentHours);
}

/** Ciclos restantes ate o vencimento por ciclos (negativo = vencido). */
export function cyclesRemaining(nextDueCycles: number | null, currentCycles: number | null): number | null {
  if (nextDueCycles == null || currentCycles == null) return null;
  return nextDueCycles - currentCycles;
}

/**
 * Urgencia do vencimento: vencido se qualquer eixo passou; "due_soon" quando
 * dentro do limiar de antecedencia; "none" se nao ha vencimento algum.
 */
export function urgencyOf(
  due: NextDue,
  currentHours: number | null,
  currentCycles: number | null,
  today: Date = new Date(),
  thresholds: UrgencyThresholds = DEFAULT_THRESHOLDS,
): Urgency {
  let overdue = false;
  let soon = false;

  const days = daysUntil(due.date, today);
  if (days != null) {
    if (days < 0) overdue = true;
    else if (days <= thresholds.dueSoonDays) soon = true;
  }

  const hours = hoursRemaining(due.hours, currentHours);
  if (hours != null) {
    if (hours <= 0) overdue = true;
    else if (hours <= thresholds.dueSoonHours) soon = true;
  }

  const cycles = cyclesRemaining(due.cycles, currentCycles);
  if (cycles != null) {
    if (cycles <= 0) overdue = true;
    else if (cycles <= thresholds.dueSoonCycles) soon = true;
  }

  if (overdue) return 'overdue';
  if (soon) return 'due_soon';
  if (due.date != null || due.hours != null || due.cycles != null) return 'upcoming';
  return 'none';
}

/** Ordem de urgencia para ordenacao (menor = mais critico). */
export const URGENCY_RANK: Readonly<Record<Urgency, number>> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  none: 3,
};

/** Texto humano do vencimento, no vocabulario do VORTEX. */
export function dueText(
  due: NextDue,
  currentHours: number | null,
  today: Date = new Date(),
): string | null {
  const parts: string[] = [];
  const days = daysUntil(due.date, today);
  if (days != null) {
    parts.push(
      days < 0 ? `vencido ha ${-days} d` : days === 0 ? 'vence hoje' : `em ${days} d`,
    );
  }
  const hours = hoursRemaining(due.hours, currentHours);
  if (hours != null) {
    parts.push(hours < 0 ? `${-hours} h excedidas` : `${hours} h restantes`);
  } else if (due.hours != null) {
    parts.push(`as ${due.hours} h`);
  }
  if (due.cycles != null) parts.push(`${due.cycles} ciclos`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Normaliza um intervalo possivelmente parcial para um `Interval` completo. */
export function normalizeInterval(interval: Partial<Interval>): Interval {
  return {
    months: interval.months ?? null,
    hours: interval.hours ?? null,
    cycles: interval.cycles ?? null,
  };
}
