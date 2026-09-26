/**
 * Ponte entre o motor de vencimento e o Hub de Alertas Preditivos.
 *
 * O motor calcula urgencia; este modulo traduz urgencia em severidade e em
 * antecedencia, alinhado a `SYSTEM_ALERTS` de `@vortex/contracts-be`. Assim o
 * alerta de vencimento nasce do mesmo calculo que sustenta a tela, sem regra
 * duplicada no frontend.
 */

import { daysUntil, hoursRemaining } from './dueness';
import type { AlertSeverity, ComplianceItem, NextDue, Urgency } from './types';

export interface ComplianceAlertSignal {
  readonly itemId: string;
  readonly kind: string;
  readonly severity: AlertSeverity;
  readonly urgency: Urgency;
  readonly advanceDays: number | null;
  readonly advanceHours: number | null;
  readonly message: string;
}

/** Severidade padrao por urgencia, usada quando o item nao traz mapeamento proprio. */
export const SEVERITY_BY_URGENCY: Readonly<Record<Urgency, AlertSeverity | null>> = {
  overdue: 'BLOCKING',
  due_soon: 'CRITICAL',
  upcoming: 'WARNING',
  none: null,
};

/**
 * Converte um item vencido/vencendo em sinal de alerta. Itens `upcoming` viram
 * WARNING (informativo de planejamento); `none` nao gera alerta. Um item
 * regulatorio vencido escala para BLOCKING: a aeronave nao voa.
 */
export function toAlertSignal(
  item: ComplianceItem,
  due: NextDue,
  currentHours: number | null,
  urgency: Urgency,
  today: Date = new Date(),
): ComplianceAlertSignal | null {
  const base = SEVERITY_BY_URGENCY[urgency];
  if (base == null) return null;

  const severity: AlertSeverity =
    urgency === 'overdue' && item.regulatory ? 'BLOCKING' : base;
  const advanceDays = daysUntil(due.date, today);
  const advanceHours = hoursRemaining(due.hours, currentHours);

  const parts: string[] = [item.label];
  if (advanceDays != null) {
    parts.push(advanceDays < 0 ? `vencido ha ${-advanceDays} dias` : `vence em ${advanceDays} dias`);
  }
  if (advanceHours != null) {
    parts.push(advanceHours < 0 ? `${-advanceHours} h excedidas` : `${advanceHours} h restantes`);
  }

  return {
    itemId: item.id,
    kind: item.kind,
    severity,
    urgency,
    advanceDays,
    advanceHours,
    message: parts.join(' - '),
  };
}
