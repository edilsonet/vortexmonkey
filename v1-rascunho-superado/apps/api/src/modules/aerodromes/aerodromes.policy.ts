export type AerodromeStatus = "OPERACIONAL" | "INOPERANTE" | "EM_OBRAS";
export type FireCategory =
  | "CAT_1"
  | "CAT_2"
  | "CAT_3"
  | "CAT_4"
  | "CAT_5"
  | "CAT_6"
  | "CAT_7"
  | "CAT_8"
  | "CAT_9"
  | "CAT_10";
export type RwyccValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FaunaEventType = "AVISTAMENTO" | "COLISAO";

export const SESCINC_MAX_RESPONSE_SECONDS = 180;
export const IRI_MAX_M_KM = 2.5;
export const MACROTEXTURE_MIN_MM = 0.6;

export const MAINTENANCE_AREAS = [
  "PISTA",
  "TAXIWAY",
  "PATIO",
  "SINALIZACAO",
  "ILUMINACAO",
  "ELETRICA",
  "EQUIPAMENTOS",
  "VEICULOS",
] as const;

export const RCAM_CONTAMINANT_RWYCC: Record<string, RwyccValue> = {
  SECO: 6,
  UMIDO: 5,
  MOLHADO_FINO: 5,
  MOLHADO: 4,
  AGUA_LAMINA: 2,
  NEVE_DERRETIDA: 2,
  NEVE_COMPACTA: 2,
  GELO: 0,
};

export const SGSO_QUARTERLY_REPORT_DATES = [
  { month: 1, day: 20 },
  { month: 5, day: 20 },
  { month: 9, day: 20 },
] as const;

export function isSescincWithinLimit(seconds: number): boolean {
  return seconds <= SESCINC_MAX_RESPONSE_SECONDS;
}

export function assertPavement(input: { iri: number; macrotexture: number }): void {
  if (input.iri > IRI_MAX_M_KM) {
    throw new Error("IRI acima de 2,5 m/km.");
  }
  if (input.macrotexture < MACROTEXTURE_MIN_MM) {
    throw new Error("Macrotextura abaixo de 0,60 mm.");
  }
}

export function rwyccFromContaminant(contaminant: string): RwyccValue {
  return RCAM_CONTAMINANT_RWYCC[contaminant] ?? 6;
}

export function formatRcr(runway: string, t1: number, t2: number, t3: number): string {
  const overall = Math.min(t1, t2, t3);
  return `RCR ${runway} T1/${t1} T2/${t2} T3/${t3} RWYCC ${overall}`;
}

export function faunaRisk(count: number): number {
  if (count <= 0) return 0;
  return Math.log10(count);
}

export function nextSgsoReportDue(now: Date): Date {
  const year = now.getUTCFullYear();
  for (const d of SGSO_QUARTERLY_REPORT_DATES) {
    const due = new Date(Date.UTC(year, d.month - 1, d.day));
    if (now.getTime() < due.getTime()) return due;
  }
  return new Date(Date.UTC(year + 1, 0, 20));
}

export const PHASE_7_AERODROMES_EVENTS = {
  AERODROME_REGISTERED: "AERODROME_REGISTERED",
  RUNWAY_PAVEMENT_REGISTERED: "RUNWAY_PAVEMENT_REGISTERED",
  RCR_ISSUED: "RCR_ISSUED",
  FIRE_RESPONSE_RECORDED: "FIRE_RESPONSE_RECORDED",
  FIRE_RESPONSE_DEVIATION: "FIRE_RESPONSE_DEVIATION",
  FAUNA_EVENT_RECORDED: "FAUNA_EVENT_RECORDED",
  FAUNA_SENT_TO_SIGRA: "FAUNA_SENT_TO_SIGRA",
} as const;
