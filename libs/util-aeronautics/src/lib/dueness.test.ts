import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  calendarMonthsDue,
  daysUntil,
  effectiveNextDue,
  nextDueFrom,
  urgencyOf,
} from './dueness';
import type { ComplianceItem } from '@vortex/shared-dto';

const item = (over: Partial<ComplianceItem>): ComplianceItem => ({
  id: 'i1',
  kind: 'INSPECAO_100H',
  label: 'Inspecao de 100 h',
  regulatory: false,
  interval: { months: null, hours: 100, cycles: null },
  monthCounting: 'calendar',
  meter: 'tach',
  lastDoneDate: null,
  lastDoneHours: null,
  lastDoneCycles: null,
  nextDueDate: null,
  nextDueHours: null,
  nextDueCycles: null,
  notes: null,
  ...over,
});

describe('datas', () => {
  it('soma dias em UTC', () => expect(addDays('2026-01-31', 1)).toBe('2026-02-01'));
  it('soma meses exatos transbordando o dia', () => expect(addMonths('2026-01-31', 1)).toBe('2026-03-03'));
  it('meses-calendario vencem no ultimo dia do mes', () =>
    expect(calendarMonthsDue('2026-01-15', 1)).toBe('2026-02-28'));
  it('conta dias ate a data (negativo = vencido)', () =>
    expect(daysUntil('2026-03-01', new Date('2026-02-28T12:00:00Z'))).toBe(1));
});

describe('nextDueFrom', () => {
  it('meses-calendario ignora o dia da assinatura', () => {
    const due = nextDueFrom(item({ interval: { months: 12, hours: null, cycles: null }, lastDoneDate: '2025-01-15' }));
    expect(due.date).toBe('2026-01-31');
  });
  it('janela de 30 dias usa dias corridos', () => {
    const due = nextDueFrom(
      item({ monthCounting: 'days30', interval: { months: 1, hours: null, cycles: null }, lastDoneDate: '2026-01-01' }),
    );
    expect(due.date).toBe('2026-01-31');
  });
  it('projeta horas e ciclos na mesma escala do item', () => {
    const due = nextDueFrom(
      item({ interval: { months: null, hours: 50, cycles: 3000 }, lastDoneHours: 1250.4, lastDoneCycles: 9000 }),
    );
    expect(due.hours).toBe(1300.4);
    expect(due.cycles).toBe(12000);
  });
});

describe('effectiveNextDue (reset cruzado)', () => {
  it('revisao geral mais recente reseta o relogio da inspecao periodica', () => {
    const insp = item({ lastDoneHours: 1200 });
    const revisao = item({ id: 'i2', kind: 'REVISAO_GERAL', lastDoneHours: 1250 });
    const due = effectiveNextDue(insp, [insp, revisao], [
      { adjustedKind: 'INSPECAO_100H', adjustedByKind: 'REVISAO_GERAL' },
    ]);
    expect(due.hours).toBe(1350);
  });
  it('sem regra aplicavel, mantem o vencimento proprio', () => {
    const insp = item({ nextDueHours: 1300, lastDoneHours: 1200 });
    const due = effectiveNextDue(insp, [insp], []);
    expect(due.hours).toBe(1300);
  });
});

describe('urgencyOf', () => {
  const due = { date: '2026-06-01', hours: 1300, cycles: null };
  it('vencido quando qualquer eixo passou', () =>
    expect(urgencyOf(due, 1300.5, null, new Date('2026-05-01T00:00:00Z'))).toBe('overdue'));
  it('due_soon dentro do limiar de horas', () =>
    expect(urgencyOf(due, 1295, null, new Date('2026-05-01T00:00:00Z'))).toBe('due_soon'));
  it('upcoming sem proximidade', () =>
    expect(urgencyOf({ date: '2027-06-01', hours: null, cycles: null }, null, null, new Date('2026-05-01T00:00:00Z'))).toBe('upcoming'));
  it('none sem vencimento', () =>
    expect(urgencyOf({ date: null, hours: null, cycles: null }, null, null)).toBe('none'));
});
