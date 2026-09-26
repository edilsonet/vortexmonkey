import { describe, expect, it } from 'vitest';
import { toConsumerMetrics, toOutboxMetrics } from './bus-metrics';

describe('toOutboxMetrics', () => {
  it('normaliza contagens bigint (string), data e atraso', () => {
    const metrics = toOutboxMetrics({
      pending: '3',
      abandoned: '1',
      published: '84',
      oldest_pending_at: '2026-09-25T10:00:00.000Z',
      lag_seconds: '125.5',
      max_pending_attempts: '4',
    });
    expect(metrics).toEqual({
      pending: 3,
      abandoned: 1,
      published: 84,
      oldestPendingAt: '2026-09-25T10:00:00.000Z',
      lagSeconds: 125.5,
      maxPendingAttempts: 4,
    });
  });

  it('trata fila vazia (sem data e sem atraso)', () => {
    const metrics = toOutboxMetrics({
      pending: 0,
      abandoned: 0,
      published: 0,
      oldest_pending_at: null,
      lag_seconds: null,
      max_pending_attempts: 0,
    });
    expect(metrics.oldestPendingAt).toBeNull();
    expect(metrics.lagSeconds).toBeNull();
  });
});

describe('toConsumerMetrics', () => {
  it('anexa o nome do consumidor e converte as contagens', () => {
    expect(
      toConsumerMetrics('ops-mro', {
        processed: '12',
        failed: '0',
        dead: '1',
        processing: '2',
      }),
    ).toEqual({ consumer: 'ops-mro', processed: 12, failed: 0, dead: 1, processing: 2 });
  });
});
