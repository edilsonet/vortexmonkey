import { describe, expect, it } from 'vitest';
import { isValidCpf, stableStringify } from './index';

describe('utils', () => {
  it('ordena objetos antes de serializar', () => expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}'));
  it('valida CPF por dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });
});
