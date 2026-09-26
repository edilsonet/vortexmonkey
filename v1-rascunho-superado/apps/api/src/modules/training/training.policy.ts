export type TrainingCenterType = "CIAC" | "CTAC";
export type CiacType = "TIPO_1_PILOTOS" | "TIPO_2_COMISSARIOS" | "TIPO_3_MECANICOS";
export type StudentStatus = "MATRICULADO" | "APROVADO" | "REPROVADO" | "CANCELADO" | "TRANSFERIDO" | "DESISTENTE";
export type CourseType = "PP" | "PC" | "PLA" | "IFR" | "COMISSARIO" | "MMA" | "DOV";
export type FstdDeviceType = "FFS" | "FTD" | "FNPT" | "BITD";
export type FstdStatus = "QUALIFICADO" | "QUALIFICACAO_VENCIDA" | "EM_MANUTENCAO";
export type InstructorType = "SOLO" | "VOO" | "SIMULADOR" | "EXAMINADOR";
export type InstructorStatus = "ATIVO" | "RECERTIFICACAO_VENCIDA" | "INATIVO";
export type TrainingDocumentType = "MIP" | "MGQ" | "MGSO" | "PRE" | "MANUAL_ALUNO" | "MANUAL_INSTRUTOR";

export const GROUND_SCHOOL_VALIDITY_MONTHS = 12;
export const CERTIFICATE_ISSUANCE_DAYS = 10;
export const EXAMINER_RECERTIFICATION_MONTHS = 24;
export const CTAC_PEDAGOGICAL_HOURS_REQUIRED = 8;
export const S141_DOUBLE_PERIOD_FACTOR = 2;

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  if (next.getUTCDate() !== day) next.setUTCDate(0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function maxDurationMonths(durationMonths: number): number {
  return durationMonths * S141_DOUBLE_PERIOD_FACTOR;
}

export function isS141Overdue(enrollmentDate: Date, durationMonths: number, now: Date): boolean {
  return now.getTime() > addMonths(enrollmentDate, maxDurationMonths(durationMonths)).getTime();
}

export function theoryValidUntil(evaluatedAt: Date): Date {
  return addMonths(evaluatedAt, GROUND_SCHOOL_VALIDITY_MONTHS);
}

export function certificateDueDate(endedAt: Date): Date {
  return addDays(endedAt, CERTIFICATE_ISSUANCE_DAYS);
}

export function assertCtacPedagogicalHours(centerType: TrainingCenterType, hours: number): void {
  if (centerType === "CTAC" && hours < CTAC_PEDAGOGICAL_HOURS_REQUIRED) {
    throw new Error("Instrutor CTAC exige 8 horas pedagogicas.");
  }
}

export function assertExaminerActive(status: InstructorStatus): void {
  if (status !== "ATIVO") {
    throw new Error("Examinador inativo ou com recertificacao vencida bloqueia banca.");
  }
}

export function assertFstdUsable(status: FstdStatus): void {
  if (status !== "QUALIFICADO") {
    throw new Error("FSTD com qualificacao vencida bloqueia sessoes.");
  }
}

export function assertGraduate(input: {
  enrollmentDate: Date;
  durationMonths: number;
  now: Date;
  theoryValidUntilDate: Date;
  examinerActive: boolean;
}): void {
  if (input.now.getTime() > input.theoryValidUntilDate.getTime()) {
    throw new Error("Avaliacao teorica expirada.");
  }
  if (isS141Overdue(input.enrollmentDate, input.durationMonths, input.now)) {
    throw new Error("Aluno no dobro do periodo letivo; cancelamento S141.");
  }
  if (!input.examinerActive) {
    throw new Error("Examinador inativo bloqueia conclusao.");
  }
}

export const PHASE_7_TRAINING_EVENTS = {
  CENTER_REGISTERED: "CENTER_REGISTERED",
  STUDENT_ENROLLED: "STUDENT_ENROLLED",
  S141_SITUATION_UPDATED: "S141_SITUATION_UPDATED",
  STUDENT_GRADUATED: "STUDENT_GRADUATED",
  CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",
  FSTD_REGISTERED: "FSTD_REGISTERED",
  INSTRUCTOR_REGISTERED: "INSTRUCTOR_REGISTERED",
} as const;
