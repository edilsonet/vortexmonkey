import type { AircraftComplianceResponse } from '@vortex/shared-dto';
import type { AlertProjection } from './mro.repository';

/**
 * O publisher envolve o payload do dominio em `{ ledgerBlockId, hash, payload }`.
 * Este acessor extrai o payload de dominio sem confiar no formato do envelope.
 */
export function domainPayload(payload: unknown): Record<string, unknown> | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const inner = (payload as { payload?: unknown }).payload;
  if (typeof inner !== 'object' || inner === null) return null;
  return inner as Record<string, unknown>;
}

/** Somente itens com sinal de alerta entram na projecao; o resto sera resolvido. */
export function toAlertProjections(
  assessment: AircraftComplianceResponse,
): AlertProjection[] {
  const projections: AlertProjection[] = [];
  for (const item of assessment.items) {
    if (item.alert === null) continue;
    projections.push({
      itemId: item.itemId,
      code: item.kind,
      severity: item.alert.severity,
      urgency: item.alert.urgency,
      title: item.label,
      detail: item.dueText,
    });
  }
  return projections;
}
