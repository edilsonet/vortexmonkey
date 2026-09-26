// VORTEX — Fase 7: ERP 141/142 — Instrução e Treinamento (CIAC/CTAC)
// RBAC 141, RBAC 142, RBAC 60 (FSTD) e integração S141 (IS 141-001).

export type TrainingCenterType = 'CIAC' | 'CTAC';
export type CiacType = 'TIPO_1_PILOTOS' | 'TIPO_2_COMISSARIOS' | 'TIPO_3_MECANICOS';
export type CenterStatus = 'ATIVO' | 'SUSPENSO' | 'REVOGADO';
export type S141Status = 'ATIVO' | 'SUSPENSO' | 'REVOGADO';
export type TrainingDocumentType = 'MIP' | 'MGQ' | 'MGSO' | 'PRE' | 'MANUAL_ALUNO' | 'MANUAL_INSTRUTOR';
export type DocumentApprovalStatus = 'MINUTA' | 'SUBMETIDO' | 'APROVADO' | 'ACEITO' | 'REJEITADO' | 'REVOGADO';
export type StudentStatus = 'MATRICULADO' | 'APROVADO' | 'REPROVADO' | 'CANCELADO' | 'TRANSFERIDO' | 'DESISTENTE';
export type CourseType = 'PP' | 'PC' | 'PLA' | 'IFR' | 'COMISSARIO' | 'MMA' | 'DOV';
export type StudentRecordType = 'FREQUENCIA' | 'NOTA' | 'FICHA_VOO' | 'AVALIACAO';
export type FstdDeviceType = 'FFS' | 'FTD' | 'FNPT' | 'BITD';
export type FstdQualificationLevel = 'LEVEL_A' | 'LEVEL_B' | 'LEVEL_C' | 'LEVEL_D' | 'BITD' | 'FNPT_I' | 'FNPT_II' | 'FTD_4' | 'FTD_5' | 'FTD_6';
export type FstdStatus = 'QUALIFICADO' | 'QUALIFICACAO_VENCIDA' | 'EM_MANUTENCAO';
export type InstructorType = 'SOLO' | 'VOO' | 'SIMULADOR' | 'EXAMINADOR';
export type InstructorStatus = 'ATIVO' | 'RECERTIFICACAO_VENCIDA' | 'INATIVO';

/** Ground school: avaliação teórica válida por 12 meses (IS 141-006/007). */
export const GROUND_SCHOOL_VALIDITY_MONTHS = 12;

/** Certificado de conclusão emitido em até 10 dias corridos (RBAC 141.141). */
export const CERTIFICATE_ISSUANCE_DAYS = 10;

/** Recertificação de examinadores a cada 24 meses (RBAC 141.75). */
export const EXAMINER_RECERTIFICATION_MONTHS = 24;

/** Fichas de instrução e avaliações guardadas por 5 anos (IS 141-006). */
export const STUDENT_RECORDS_RETENTION_YEARS = 5;

/** Vistorias semestrais ANAC: 2x/ano, máximo 180 dias entre elas (IS 141-005). */
export const SEMIANNUAL_INSPECTIONS_PER_YEAR = 2;
export const MAX_DAYS_BETWEEN_INSPECTIONS = 180;

/** Comunicação de vacância de cargos de direção em até 60 dias (IS 141-004). */
export const VACANCY_NOTIFICATION_DAYS = 60;

/** Instrutor de CTAC exige 8 horas de treinamento pedagógico inicial (IS 142-003). */
export const CTAC_PEDAGOGICAL_HOURS_REQUIRED = 8;

/** S141 (IS 141-001): aluno no dobro do período letivo homologado é cancelado. */
export const S141_DOUBLE_PERIOD_FACTOR = 2;

export const PHASE_7_TRAINING_EVENTS = {
  CENTER_REGISTERED: 'CENTER_REGISTERED',
  TRAINING_DOCUMENT_CREATED: 'TRAINING_DOCUMENT_CREATED',
  STUDENT_ENROLLED: 'STUDENT_ENROLLED',
  S141_SITUATION_UPDATED: 'S141_SITUATION_UPDATED',
  STUDENT_TRANSFERRED: 'STUDENT_TRANSFERRED',
  STUDENT_GRADUATED: 'STUDENT_GRADUATED',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  STUDENT_RECORD_CREATED: 'STUDENT_RECORD_CREATED',
  FSTD_REGISTERED: 'FSTD_REGISTERED',
  FSTD_QUALIFICATION_EXPIRED: 'FSTD_QUALIFICATION_EXPIRED',
  INSTRUCTOR_REGISTERED: 'INSTRUCTOR_REGISTERED',
  INSTRUCTOR_RECERTIFICATION_EXPIRED: 'INSTRUCTOR_RECERTIFICATION_EXPIRED',
} as const;