import { describe, expect, it } from 'vitest';
import { computeUtilization, projectDueDate, utilizationFor } from './utilization';
import type { MeterReading } from '@vortex/shared-dto';

const readings: MeterReading[] = [
  { date: '2026-01-01', tach: 1000, hobbs: 1500 },
  { date: '2026-03-01', tach: 1060, hobbs: 1600 },
  { date: '2026-05-01', tach: 1120, hobbs: 1700 },
  { date: '2026-07-01', tach: 1180, hobbs: 1800 },
];

describe('utilizationFor', () => {
  it('calcula horas/dia na janela', () => {
    const u = utilizationFor(readings, [], 'tach', new Date('2026-08-01T00:00:00Z'));
    // 180 h em 181 dias (1 jan -> 1 jul)
    expect(u.hoursPerDay).toBeCloseTo(180 / 181, 5);
    expect(u.sampleCount).toBe(4);
    expect(u.confidence).toBe('medium');
  });

  it('ignora leituras estimadas (evita circularidade)', () => {
    const withEstimated: MeterReading[] = [
      ...readings,
      { date: '2026-08-01', tach: 1240, estimated: true },
    ];
    const u = utilizationFor(withEstimated, [], 'tach', new Date('2026-08-02T00:00:00Z'));
    expect(u.sampleCount).toBe(4);
  });

  it('descarta o intervalo que cruza um reset declarado', () => {
    const u = utilizationFor(readings, [{ meter: 'tach', resetDate: '2026-03-15' }], 'tach', new Date('2026-08-01T00:00:00Z'));
    // o intervalo 1 mar -> 1 mai sai das horas E dos dias: sobra 120 h em 120 dias
    expect(u.hoursPerDay).toBeCloseTo(1, 5);
  });

  it('nao vira taxa negativa com medidor recuando (leitura ruim)', () => {
    const bad: MeterReading[] = [
      { date: '2026-01-01', tach: 1000 },
      { date: '2026-03-01', tach: 900 },
      { date: '2026-05-01', tach: 1000 },
    ];
    const u = utilizationFor(bad, [], 'tach', new Date('2026-06-01T00:00:00Z'));
    // o intervalo negativo (1 jan -> 1 mar) e descartado; sobra 1 mar -> 1 mai
    expect(u.hoursPerDay).toBeCloseTo(100 / 61, 5);
    expect(u.confidence).toBe('low');
  });
});

describe('computeUtilization', () => {
  it('prefere tach; cai para hobbs quando tach nao da taxa', () => {
    const onlyHobbs: MeterReading[] = [
      { date: '2026-01-01', hobbs: 1500 },
      { date: '2026-05-01', hobbs: 1700 },
    ];
    const u = computeUtilization(onlyHobbs, [], new Date('2026-06-01T00:00:00Z'));
    expect(u.meter).toBe('hobbs');
  });
});

describe('projectDueDate', () => {
  const u = { hoursPerDay: 2, sampleCount: 10, spanDays: 200, confidence: 'high' as const, windowStart: '2025-01-01', windowEnd: '2026-01-01', meter: 'tach' as const };
  it('projeta a data que esgota as horas restantes', () =>
    expect(projectDueDate(20, u, new Date('2026-01-01T00:00:00Z'))?.date).toBe('2026-01-11'));
  it('nao projeta item ja vencido', () =>
    expect(projectDueDate(-1, u, new Date('2026-01-01T00:00:00Z'))).toBeNull());
  it('nao projeta sem taxa confiavel', () =>
    expect(projectDueDate(20, { ...u, confidence: 'none' }, new Date('2026-01-01T00:00:00Z'))).toBeNull());
});
