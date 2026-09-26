import { UnprocessableEntityException } from '@nestjs/common';
import type { ProtocolAccessLevel } from '@vortex/contracts-be';

export const validateAccess = (accessLevel: ProtocolAccessLevel, restrictionBasis: string | undefined, containsPersonalData: boolean): void => {
  if (containsPersonalData && accessLevel === 'PUBLIC') throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Documento com dado pessoal não pode ser público.' });
  if (accessLevel === 'PUBLIC' && restrictionBasis) throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Protocolo público não aceita hipótese de restrição.' });
  if (accessLevel !== 'PUBLIC' && !restrictionBasis) throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Informe a hipótese legal de restrição.' });
};

export const accessRank = (level: ProtocolAccessLevel): number => ({ PUBLIC: 0, RESTRICTED: 1, PRIVATE: 2 })[level];
export const addUtcDays = (date: Date, days: number): Date => { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; };
