import { describe, expect, it } from 'vitest';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  const service = new RefreshTokenService();

  it('gera tokens distintos dentro da mesma familia', () => {
    const first = service.issue();
    const second = service.issue(first.familyId);
    expect(first.familyId).toBe(second.familyId);
    expect(first.token).not.toBe(second.token);
    expect(first.id).not.toBe(second.id);
  });

  it('persiste apenas o hash SHA-256 (64 hex) e nunca o segredo', () => {
    const issued = service.issue();
    expect(issued.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.hash).toBe(service.hash(issued.token));
    expect(issued.hash).not.toBe(issued.token);
  });

  it('usa o TTL padrao de 30 dias', () => {
    expect(service.issue().expiresIn).toBe(2_592_000);
  });
});
