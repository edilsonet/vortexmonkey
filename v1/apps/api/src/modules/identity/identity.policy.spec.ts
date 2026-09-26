import { describe, expect, it } from 'vitest';
import { accreditationState, addUtcDays } from './identity.policy';

describe('política de credenciamento RBAC 183', () => {
  const rules = { validityDays: 1095, renewalAlertDays: 60 };
  it('calcula a validade oficial em 1.095 dias', () => expect(addUtcDays('2026-01-01', rules.validityDays)).toBe('2028-12-31'));
  it('bloqueia credenciamento expirado', () => expect(accreditationState('2026-01-01', rules, new Date('2026-01-02T00:00:00Z'))).toBe('EXPIRED'));
  it('alerta com 60 dias de antecedência', () => expect(accreditationState('2026-03-01', rules, new Date('2026-01-01T00:00:00Z'))).toBe('EXPIRING'));
});
