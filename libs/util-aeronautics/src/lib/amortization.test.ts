import { describe, expect, it } from 'vitest';
import {
  calculateTimeBasedAmortization,
  calculateUsageBasedAmortization,
  getAmortizationRate,
  validateAmortizationConfig,
} from './amortization';
import { normalizeCounterLog } from './counter';

describe('rateio por tempo', () => {
  const config = { basis: 'time' as const, totalCost: 36000, startDate: '2026-01-01', endDate: '2026-01-31' };
  it('valida configuracao', () => expect(validateAmortizationConfig(config)).toBeNull());
  it('taxa por dia', () => expect(getAmortizationRate(config)?.rate).toBe(1200));
  it('rateia a sobreposicao com o periodo', () => {
    const r = calculateTimeBasedAmortization(config, '2026-01-01', '2026-01-15');
    expect(r?.amortizedCost).toBe(16800);
    expect(r?.isPartial).toBe(true);
  });
  it('sem sobreposicao devolve zero', () => {
    const r = calculateTimeBasedAmortization(config, '2026-03-01', '2026-03-31');
    expect(r?.amortizedCost).toBe(0);
  });
  it('rejeita custo nao positivo', () => {
    expect(validateAmortizationConfig({ ...config, totalCost: 0 })).not.toBeNull();
  });
});

describe('rateio por uso', () => {
  const log = normalizeCounterLog(
    [
      { changeDate: '2026-01-01', value: 1000 },
      { changeDate: '2026-06-01', value: 1600 },
    ],
    'tach',
  );
  const config = { basis: 'usage' as const, totalCost: 12000, startCounterValue: 1000, endCounterValue: 1600 };
  it('rateia as horas consumidas no periodo', () => {
    const r = calculateUsageBasedAmortization(config, '2026-01-01', '2026-03-01', log);
    expect(r?.ratePerUnit).toBe(20);
    expect(r?.amortizedCost).toBeGreaterThan(0);
    expect(r?.amortizedCost).toBeLessThan(12000);
  });
});
