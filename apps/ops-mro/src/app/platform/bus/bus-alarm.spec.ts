import type { BusMetrics } from '@vortex/shared-dto';
import { describe, expect, it } from 'vitest';
import { evaluateBusAlarms } from './bus-alarm';

function metrics(overrides: {
  lagSeconds?: number | null;
  pending?: number;
  abandoned?: number;
  dead?: number;
}): BusMetrics {
  return {
    outbox: {
      pending: overrides.pending ?? 0,
      abandoned: overrides.abandoned ?? 0,
      published: 10,
      oldestPendingAt: null,
      lagSeconds: overrides.lagSeconds ?? null,
      maxPendingAttempts: 0,
    },
    consumer: {
      consumer: 'ops-mro',
      processed: 5,
      failed: 0,
      dead: overrides.dead ?? 0,
      processing: 0,
    },
    alarms: [],
  };
}

const codes = (m: BusMetrics) => evaluateBusAlarms(m).map((alarm) => alarm.code);

describe('evaluateBusAlarms', () => {
  it('nao alarma quando tudo esta normal', () => {
    expect(codes(metrics({}))).toEqual([]);
  });

  it('alarma atraso em WARNING e CRITICAL conforme o limiar', () => {
    expect(codes(metrics({ lagSeconds: 400 }))).toEqual(['OUTBOX_LAG_WARNING']);
    expect(codes(metrics({ lagSeconds: 1_900 }))).toEqual(['OUTBOX_LAG_CRITICAL']);
  });

  it('nao promove WARNING quando ja e CRITICAL', () => {
    const result = evaluateBusAlarms(metrics({ lagSeconds: 1_900 }));
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe('CRITICAL');
  });

  it('alarma evento abandonado como CRITICAL', () => {
    const result = evaluateBusAlarms(metrics({ abandoned: 2 }));
    expect(result).toEqual([
      {
        code: 'OUTBOX_ABANDONED',
        severity: 'CRITICAL',
        message: '2 evento(s) abandonado(s) apos o teto de tentativas.',
        context: { abandoned: 2, maxPendingAttempts: 0 },
      },
    ]);
  });

  it('alarma dead-letter do consumidor como WARNING', () => {
    expect(evaluateBusAlarms(metrics({ dead: 1 }))[0]?.code).toBe('CONSUMER_DEAD_LETTER');
  });

  it('acumula alarmes independentes', () => {
    expect(codes(metrics({ lagSeconds: 400, abandoned: 1, dead: 3 }))).toEqual([
      'OUTBOX_LAG_WARNING',
      'OUTBOX_ABANDONED',
      'CONSUMER_DEAD_LETTER',
    ]);
  });
});
