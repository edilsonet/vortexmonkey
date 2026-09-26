import type {
  AircraftComplianceResponse,
  ComplianceAssessment,
  NextDue,
} from '@vortex/shared-dto';
import { describe, expect, it } from 'vitest';
import { domainPayload, toAlertProjections } from './alert-projection';

const due: NextDue = { date: null, hours: null, cycles: null };

function item(overrides: Partial<ComplianceAssessment>): ComplianceAssessment {
  return {
    itemId: '11111111-1111-1111-1111-111111111111',
    kind: 'AD',
    label: 'Diretriz de aeronavegabilidade',
    nextDue: due,
    urgency: 'overdue',
    dueText: 'vencido ha 3 d',
    alert: {
      itemId: '11111111-1111-1111-1111-111111111111',
      kind: 'AD',
      severity: 'BLOCKING',
      urgency: 'overdue',
      advanceDays: -3,
      advanceHours: null,
      message: 'Diretriz de aeronavegabilidade vencido ha 3 dias',
    },
    projection: null,
    ...overrides,
  };
}

function assessment(items: readonly ComplianceAssessment[]): AircraftComplianceResponse {
  return {
    aircraftId: '22222222-2222-2222-2222-222222222222',
    today: '2026-09-25',
    worstUrgency: 'overdue',
    items,
    utilization: null,
  };
}

describe('domainPayload', () => {
  it('extrai o payload de dominio do envelope do publisher', () => {
    const payload = { ledgerBlockId: 'b', hash: 'h', payload: { aircraftId: 'a' } };
    expect(domainPayload(payload)).toEqual({ aircraftId: 'a' });
  });

  it('devolve null quando o envelope nao tem payload de objeto', () => {
    expect(domainPayload(null)).toBeNull();
    expect(domainPayload('texto')).toBeNull();
    expect(domainPayload({ ledgerBlockId: 'b' })).toBeNull();
    expect(domainPayload({ payload: 42 })).toBeNull();
  });
});

describe('toAlertProjections', () => {
  it('projeta os itens com alerta e ignora os sem sinal', () => {
    const projections = toAlertProjections(
      assessment([
        item({}),
        item({ itemId: '33333333-3333-3333-3333-333333333333', kind: 'A', alert: null, urgency: 'none' }),
      ]),
    );
    expect(projections).toHaveLength(1);
    expect(projections[0]).toEqual({
      itemId: '11111111-1111-1111-1111-111111111111',
      code: 'AD',
      severity: 'BLOCKING',
      urgency: 'overdue',
      title: 'Diretriz de aeronavegabilidade',
      detail: 'vencido ha 3 d',
    });
  });

  it('devolve lista vazia quando nada esta em urgencia', () => {
    expect(
      toAlertProjections(assessment([item({ alert: null, urgency: 'none' })])),
    ).toEqual([]);
  });
});
