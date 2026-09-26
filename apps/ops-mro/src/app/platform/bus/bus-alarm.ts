import type { AlertSeverity, BusMetrics } from '@vortex/shared-dto';

export interface BusAlarmThresholds {
  readonly lagWarnSeconds: number;
  readonly lagCriticalSeconds: number;
}

export const DEFAULT_BUS_ALARM_THRESHOLDS: BusAlarmThresholds = {
  lagWarnSeconds: 300,
  lagCriticalSeconds: 1_800,
};

/** Alarme a sincronizar: o `code` e a chave de deduplicacao. */
export interface BusAlarmDraft {
  readonly code: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

/**
 * Avalia os limiares do bus. Puro de proposito: o alarme e uma funcao do
 * estado observado, entao da para testar a decisao sem banco nem fila.
 *
 * Regras:
 * - `lagSeconds >= critico` -> CRITICAL; `>= aviso` -> WARNING;
 * - evento abandonado (nao publicou no teto de tentativas) -> CRITICAL;
 * - mensagem na dead-letter do consumidor -> WARNING.
 */
export function evaluateBusAlarms(
  metrics: BusMetrics,
  thresholds: BusAlarmThresholds = DEFAULT_BUS_ALARM_THRESHOLDS,
): BusAlarmDraft[] {
  const alarms: BusAlarmDraft[] = [];
  const lag = metrics.outbox.lagSeconds;

  if (lag !== null && lag >= thresholds.lagCriticalSeconds) {
    alarms.push({
      code: 'OUTBOX_LAG_CRITICAL',
      severity: 'CRITICAL',
      message: `Outbox com atraso critico: ${Math.round(lag)}s sem publicar.`,
      context: { lagSeconds: lag, pending: metrics.outbox.pending },
    });
  } else if (lag !== null && lag >= thresholds.lagWarnSeconds) {
    alarms.push({
      code: 'OUTBOX_LAG_WARNING',
      severity: 'WARNING',
      message: `Outbox com atraso acima do esperado: ${Math.round(lag)}s.`,
      context: { lagSeconds: lag, pending: metrics.outbox.pending },
    });
  }

  if (metrics.outbox.abandoned > 0) {
    alarms.push({
      code: 'OUTBOX_ABANDONED',
      severity: 'CRITICAL',
      message: `${metrics.outbox.abandoned} evento(s) abandonado(s) apos o teto de tentativas.`,
      context: {
        abandoned: metrics.outbox.abandoned,
        maxPendingAttempts: metrics.outbox.maxPendingAttempts,
      },
    });
  }

  if (metrics.consumer.dead > 0) {
    alarms.push({
      code: 'CONSUMER_DEAD_LETTER',
      severity: 'WARNING',
      message: `${metrics.consumer.dead} mensagem(ns) na dead-letter do consumidor.`,
      context: { dead: metrics.consumer.dead },
    });
  }

  return alarms;
}
