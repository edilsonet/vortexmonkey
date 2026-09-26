import { describe, expect, it } from 'vitest';
import { assessWB, completeWB, staleWBChanges, usefulLoad } from './weightBalance';

describe('completeWB', () => {
  it('deriva o momento de peso x braco', () =>
    expect(completeWB({ weight: 800, arm: 39.5, moment: null }).moment).toBe(31600));
  it('deriva o braco do momento / peso', () =>
    expect(completeWB({ weight: 800, arm: null, moment: 31600 }).arm).toBeCloseTo(39.5, 3));
  it('nao divide por zero', () =>
    expect(completeWB({ weight: 0, arm: null, moment: 100 }).arm).toBeNull());
});

describe('usefulLoad', () => {
  it('carga util = maximo menos vazio', () => expect(usefulLoad(800, 1157)).toBe(357));
  it('null quando falta um dado', () => expect(usefulLoad(null, 1157)).toBeNull());
});

describe('staleWBChanges', () => {
  const changes = [
    { name: 'GPS', date: '2026-01-10', kind: 'install' as const },
    { name: 'Transponder', date: '2026-03-10', kind: 'install' as const },
  ];
  it('filtra apenas o que veio depois do W&B, do mais recente ao mais antigo', () => {
    expect(staleWBChanges('2026-02-01', changes).map((c) => c.name)).toEqual(['Transponder']);
  });
  it('sem W&B, tudo esta pendente', () =>
    expect(staleWBChanges(null, changes).map((c) => c.name)).toEqual(['Transponder', 'GPS']));
});

describe('assessWB', () => {
  it('incomplete quando falta valor e stale quando ha alteracao depois', () => {
    const r = assessWB({
      triple: { weight: 800, arm: null, moment: 31600 },
      latestWBDate: '2026-02-01',
      changes: [{ name: 'GPS', date: '2026-03-01', kind: 'install' }],
    });
    expect(r.status).toBe('incomplete');
    expect(r.missing).toEqual(['arm']);
    expect(r.staleChanges).toHaveLength(1);
  });
});
