import type { Urgency } from '@vortex/shared-dto';
import { VortexApiError } from '@vortex/core';

/** Ordem de gravidade para agregar a pior urgencia de uma aeronave. */
export const URGENCY_RANK: Record<Urgency, number> = {
  overdue: 3,
  due_soon: 2,
  upcoming: 1,
  none: 0,
};

export function worstOf(urgencies: readonly Urgency[]): Urgency {
  return urgencies.reduce<Urgency>(
    (worst, current) => (URGENCY_RANK[current] > URGENCY_RANK[worst] ? current : worst),
    'none',
  );
}

export function errorMessage(cause: unknown): string {
  if (cause instanceof VortexApiError) {
    return cause.message;
  }
  return 'Falha inesperada. Tente novamente.';
}

/** Horas com uma casa; `--` quando nao ha leitura. */
export function hours(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : value.toFixed(1);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
