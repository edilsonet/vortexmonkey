import { describe, expect, it } from 'vitest';
import { toAlertSignal } from './alerts';
import type { ComplianceItem } from '@vortex/shared-dto';

const item: ComplianceItem = {
  id: 'ad-1',
  kind: 'DA',
  label: 'DA 2021-05-03',
  regulatory: true,
  interval: { months: 12, hours: null, cycles: null },
  monthCounting: 'calendar',
  meter: null,
  lastDoneDate: '2025-01-01',
  lastDoneHours: null,
  lastDoneCycles: null,
  nextDueDate: '2026-01-31',
  nextDueHours: null,
  nextDueCycles: null,
  notes: null,
};

describe('toAlertSignal', () => {
  it('item regulatorio vencido escala para BLOCKING', () => {
    const s = toAlertSignal(item, { date: '2026-01-31', hours: null, cycles: null }, null, 'overdue', new Date('2026-02-10T00:00:00Z'));
    expect(s?.severity).toBe('BLOCKING');
    expect(s?.message).toContain('vencido');
  });
  it('item nao regulatorio vencido e BLOCKING por urgencia', () => {
    const s = toAlertSignal({ ...item, regulatory: false }, { date: '2026-01-31', hours: null, cycles: null }, null, 'overdue', new Date('2026-02-10T00:00:00Z'));
    expect(s?.severity).toBe('BLOCKING');
  });
  it('upcoming vira WARNING', () => {
    const s = toAlertSignal(item, { date: '2026-12-31', hours: null, cycles: null }, null, 'upcoming', new Date('2026-02-10T00:00:00Z'));
    expect(s?.severity).toBe('WARNING');
  });
  it('nenhuma urgencia nao gera alerta', () => {
    const s = toAlertSignal(item, { date: null, hours: null, cycles: null }, null, 'none', new Date());
    expect(s).toBeNull();
  });
});
