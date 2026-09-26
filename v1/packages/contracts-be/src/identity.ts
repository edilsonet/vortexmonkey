export const SYSTEM_ROLES = [
  'VISITANTE', 'RCONTA', 'CRIADOR_EMPRESA', 'ADMIN', 'REPRESENTANTE_LEGAL',
  'PROCURADOR', 'PROPRIETARIO_OPERADOR', 'FUNCIONARIO'
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const FUNCTIONAL_POSITIONS = [
  'PILOTO', 'CONTROLADOR_TECNICO', 'MECANICO', 'AUXILIAR', 'APOIO_SOLO',
  'GERENTE_RESPONSAVEL', 'GERENTE_QUALIDADE', 'GESTOR_SGSO', 'DIRETOR_MANUTENCAO',
  'DIRETOR_OPERACAO', 'ADMINISTRATIVO', 'INSTRUTOR', 'EXAMINADOR'
] as const;

export const PROFESSIONAL_TYPES = ['PILOTO','COMISSARIO','MECANICO_VOO','MMA','DOV','INSTRUTOR','EXAMINADOR','OUTRO'] as const;
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[number];

export const LICENSE_TYPES = ['PP','PC','PLA','MMA','DOV','COMISSARIO','MECANICO_VOO'] as const;
export type LicenseType = (typeof LICENSE_TYPES)[number];

export const RATINGS = ['IFRA','MLTE','MNTE','IFRH','CELULA','GMP','AVIONICOS'] as const;
export type Rating = (typeof RATINGS)[number];

export const ACCREDITATION_TYPES = ['PCP','PCF','PCA','EXAMINADOR_MMA','SDEA_PROVISORIO'] as const;
export type AccreditationType = (typeof ACCREDITATION_TYPES)[number];

export const ACCREDITATION_SCOPES = ['GRUPO_A_PEQUENO_PORTE','GRUPO_B_MEDIO_PORTE','GRUPO_C_GRANDE_PORTE'] as const;

export const DOMAIN_EVENTS = {
  PROFILE_UPDATED: 'identity.profile.updated.v1',
  LICENSE_REGISTERED: 'identity.license.registered.v1',
  ACCREDITATION_REGISTERED: 'identity.accreditation.registered.v1',
  RELATIONSHIP_CREATED: 'identity.relationship.created.v1',
} as const;
