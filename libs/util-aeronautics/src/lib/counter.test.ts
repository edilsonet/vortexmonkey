import { describe, expect, it } from 'vitest';
import {
  getCounterValue,
  getOwnerHours,
  normalizeCounterLog,
  validateCounterUpdate,
} from './counter';

const log = normalizeCounterLog(
  [
    { changeDate: '2026-01-01T12:00:00Z', value: 1000 },
    { changeDate: '2026-01-01T08:00:00Z', value: 995 },
    { changeDate: '2026-03-01', value: 1060 },
    { changeDate: '2026-05-01', value: 1120 },
  ],
  'tach',
);

describe('normalizeCounterLog', () => {
  it('colapsa mesma data no maior valor e ordena', () => {
    expect(log.entries.map((e) => e.value)).toEqual([1000, 1060, 1120]);
  });
});

describe('getCounterValue', () => {
  it('leitura exata e actual/high', () => {
    const r = getCounterValue(log, '2026-03-01');
    expect(r?.value).toBe(1060);
    expect(r?.type).toBe('actual');
  });
  it('interpola entre leituras', () => {
    const r = getCounterValue(log, '2026-04-01');
    expect(r?.type).toBe('interpolated');
    expect(r?.value).toBeCloseTo(1090.5, 1);
  });
  it('extrapola apos a ultima leitura', () => {
    const r = getCounterValue(log, '2026-06-01');
    expect(r?.type).toBe('extrapolated');
    expect(r?.value).toBeGreaterThan(1120);
  });
  it('antes do historico usa a leitura mais antiga com baixa confianca', () => {
    const r = getCounterValue(log, '2025-12-01');
    expect(r?.type).toBe('interpolated');
    expect(r?.confidence).toBe('low');
  });
});

describe('validateCounterUpdate', () => {
  it('recusa valor menor que a ultima leitura', () => {
    const v = validateCounterUpdate(log.entries, '2026-06-01', { tach: 1100 });
    expect(v.isValid).toBe(false);
  });
  it('aceita valor maior que a ultima leitura', () => {
    const v = validateCounterUpdate(log.entries, '2026-06-01', { tach: 1150 });
    expect(v.isValid).toBe(true);
  });
  it('recusa retroativo fora da faixa entre vizinhos', () => {
    const v = validateCounterUpdate(log.entries, '2026-04-01', { tach: 1200 });
    expect(v.isValid).toBe(false);
  });
  it('aceita retroativo dentro da faixa', () => {
    const v = validateCounterUpdate(log.entries, '2026-04-01', { tach: 1100 });
    expect(v.isValid).toBe(true);
  });
});

describe('getOwnerHours', () => {
  it('desconta o valor de aquisicao sem ficar negativo', () => {
    expect(getOwnerHours(1300, 1200)).toBe(100);
    expect(getOwnerHours(1100, 1200)).toBe(0);
  });
});
