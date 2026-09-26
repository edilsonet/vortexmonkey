import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateAccess } from './protocol.access-policy';

describe('política de acesso do protocolo', () => {
  it('aceita protocolo público sem dado pessoal ou restrição', () => {
    expect(() => validateAccess('PUBLIC', undefined, false)).not.toThrow();
  });

  it('bloqueia dado pessoal em protocolo público', () => {
    expect(() => validateAccess('PUBLIC', undefined, true)).toThrow(UnprocessableEntityException);
  });

  it('exige hipótese legal em protocolo restrito ou privado', () => {
    expect(() => validateAccess('RESTRICTED', undefined, false)).toThrow(UnprocessableEntityException);
    expect(() => validateAccess('PRIVATE', 'ONGOING_PROCESS', false)).not.toThrow();
  });
});
