import { describe, expect, it } from 'vitest';
import { RBAC_183_SEEDS } from './regulatory-seeds';

describe('seeds oficiais RBAC 183', () => {
  it('preserva os valores oficiais da delimitação', () => {
    const seed = RBAC_183_SEEDS.find((item) => item.id === 479);
    expect(seed?.parameters).toMatchObject({ accreditationValidityDays: 1095, renewalAlertDays: 60 });
  });
});
