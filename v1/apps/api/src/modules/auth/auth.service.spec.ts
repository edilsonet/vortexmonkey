import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './auth.service';

describe('credenciais locais', () => {
  it('verifica a senha com scrypt e comparação constante', async () => {
    const salt = randomBytes(16).toString('hex');
    const hash = await hashPassword('uma-senha-forte-123', salt);
    expect(await verifyPassword('uma-senha-forte-123', salt, hash)).toBe(true);
    expect(await verifyPassword('senha-incorreta', salt, hash)).toBe(false);
  });
});
