export type OperatorType = "RBAC_91" | "RBAC_121" | "RBAC_135" | "RBAC_137";
export type CertificationPhase = "FASE_1" | "FASE_2" | "FASE_3" | "FASE_4" | "FASE_5" | "CERTIFICADO";
export type MelCategory = "CAT_A" | "CAT_B" | "CAT_C" | "CAT_D";
export type MelStatus = "OPERACIONAL" | "DIFERIDO" | "EXPIRADO" | "REPARADO";
export type AircraftCategory = "AVIAO" | "HELICOPTERO" | "JATO" | "TURBOELICE";
export type FlightRule = "VFR" | "IFR";
export type DispatchStatus = "RASCUNHO" | "VALIDADO" | "LIBERADO" | "BLOQUEADO" | "EXECUTADO";
export type LogbookStatus = "draft" | "signed" | "rectified" | "voided";
export type CvaStatus = "NAO_EMITIDO" | "VALIDO" | "VENCIDO" | "BLOQUEADO" | "ALERTA";
export type DisperserStatus = "OPERACIONAL" | "CALIBRACAO_VENCIDA" | "INOPERANTE";
export type DisperserType = "SOLIDOS" | "LIQUIDOS" | "GRANULARES";
export type ManualType = "MGO" | "AOM" | "MCMSV" | "MGM" | "PTO" | "SOP" | "MIP";

export const MEL_CATEGORY_DAYS: Record<MelCategory, number | null> = {
  CAT_A: null,
  CAT_B: 3,
  CAT_C: 10,
  CAT_D: 120,
};

export const FUEL_MINUTES = {
  VFR_AVIAO_DIA: 30,
  VFR_AVIAO_NOITE: 45,
  VFR_HELICOPTERO: 20,
  IFR_SEM_ALTERNATIVA: 120,
  IFR_COM_ALTERNATIVA: 45,
} as const;

export const REWEIGH_MONTHS = 36;
export const CVA_VALIDITY_DAYS = 365;
export const CVA_ALERT_DAYS = 30;
export const PERFORMANCE_MARGIN_C = 4;
export const PAADV_TEMP_DELTA_C = 5;
export const PAADV_QNH_DELTA_HPA = 5;
export const PAADV_WIND_VARIATION = 0.01;

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

export function melDeferralDeadline(category: MelCategory, from: Date): Date | null {
  const days = MEL_CATEGORY_DAYS[category];
  if (days == null) return null;
  return addDays(from, days);
}

export function assertDaDoesNotBlockDeferral(daPending: boolean): void {
  if (daPending) {
    throw new Error("DA prevalece sobre MEL; diferimento bloqueado.");
  }
}

export function nextReweighDate(last: Date): Date {
  return addMonths(last, REWEIGH_MONTHS);
}

export function isReweighExpired(last: Date, now: Date): boolean {
  return now.getTime() > nextReweighDate(last).getTime();
}

export function fuelReserveMinutes(input: {
  rule: FlightRule;
  category: AircraftCategory;
  night: boolean;
  hasAlternate?: boolean;
}): number {
  if (input.rule === "IFR") {
    return input.hasAlternate ? FUEL_MINUTES.IFR_COM_ALTERNATIVA : FUEL_MINUTES.IFR_SEM_ALTERNATIVA;
  }
  if (input.category === "HELICOPTERO") return FUEL_MINUTES.VFR_HELICOPTERO;
  return input.night ? FUEL_MINUTES.VFR_AVIAO_NOITE : FUEL_MINUTES.VFR_AVIAO_DIA;
}

export function performanceTempC(forecastMaxC: number): number {
  return forecastMaxC + PERFORMANCE_MARGIN_C;
}

export function paadvNotes(input: {
  tempDeltaC: number;
  qnhDeltaHpa: number;
  windVariation: number;
}): string[] {
  const notes: string[] = [];
  if (input.tempDeltaC >= PAADV_TEMP_DELTA_C) notes.push("TEMP");
  if (input.qnhDeltaHpa <= -PAADV_QNH_DELTA_HPA) notes.push("QNH");
  if (input.windVariation > PAADV_WIND_VARIATION) notes.push("WIND");
  return notes;
}

export function cvaStatusOn(issuedAt: Date, now: Date, critical: boolean): CvaStatus {
  if (critical) return "BLOQUEADO";
  const validUntil = addDays(issuedAt, CVA_VALIDITY_DAYS);
  if (now.getTime() > validUntil.getTime()) return "VENCIDO";
  const alertFrom = addDays(validUntil, -CVA_ALERT_DAYS);
  if (now.getTime() >= alertFrom.getTime()) return "ALERTA";
  return "VALIDO";
}

export type DispatchInput = {
  fuelPlannedMinutes: number;
  fuelRequiredMinutes: number;
  metValid: boolean;
  weightBalanceValid: boolean;
  melExpired: boolean;
  daPending: boolean;
  cvaBlocked: boolean;
  reweighExpired: boolean;
};

export function validateDispatch(input: DispatchInput): { status: DispatchStatus; reasons: string[] } {
  const reasons: string[] = [];
  if (input.fuelPlannedMinutes < input.fuelRequiredMinutes) reasons.push("COMBUSTIVEL");
  if (!input.metValid) reasons.push("MET");
  if (!input.weightBalanceValid) reasons.push("PB");
  if (input.melExpired) reasons.push("MEL");
  if (input.daPending) reasons.push("DA");
  if (input.cvaBlocked) reasons.push("CVA");
  if (input.reweighExpired) reasons.push("REPESO");
  return { status: reasons.length ? "BLOQUEADO" : "VALIDADO", reasons };
}

export function assertLogbookSignable(status: LogbookStatus): void {
  if (status !== "draft") {
    throw new Error("Logbook so assina a partir de rascunho.");
  }
}

export function assertDisperserUsable(status: DisperserStatus): void {
  if (status === "CALIBRACAO_VENCIDA") {
    throw new Error("Dispersor com calibracao vencida bloqueado.");
  }
  if (status === "INOPERANTE") {
    throw new Error("Dispersor inoperante bloqueado.");
  }
}

export const PHASE_6_EVENTS = {
  OPERATOR_REGISTERED: "OPERATOR_REGISTERED",
  FLEET_ADDED: "FLEET_ADDED",
  MEL_ITEM_CREATED: "MEL_ITEM_CREATED",
  MEL_ITEM_DEFERRED: "MEL_ITEM_DEFERRED",
  MEL_ITEM_REPAIRED: "MEL_ITEM_REPAIRED",
  LOGBOOK_ENTRY_CREATED: "LOGBOOK_ENTRY_CREATED",
  LOGBOOK_SIGNED: "LOGBOOK_SIGNED",
  DISPATCH_CREATED: "DISPATCH_CREATED",
  DISPATCH_VALIDATED: "DISPATCH_VALIDATED",
  DISPATCH_BLOCKED: "DISPATCH_BLOCKED",
  DISPATCH_RELEASED: "DISPATCH_RELEASED",
  MANUAL_CREATED: "MANUAL_CREATED",
  AGRI_OPERATOR_REGISTERED: "AGRI_OPERATOR_REGISTERED",
  DISPERSER_REGISTERED: "DISPERSER_REGISTERED",
  CVA_RECORDED: "CVA_RECORDED",
} as const;
