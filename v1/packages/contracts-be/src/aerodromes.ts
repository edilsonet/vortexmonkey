// VORTEX — Fase 7: ERP 153 — Aeródromos
// RBAC 153: SOCMS, RWYCC/RCR (RCAM), SESCINC, fauna (SIGRA) e SGSO.

export type AerodromeStatus = 'OPERACIONAL' | 'INOPERANTE' | 'EM_OBRAS';
export type FireCategory = 'CAT_1' | 'CAT_2' | 'CAT_3' | 'CAT_4' | 'CAT_5' | 'CAT_6' | 'CAT_7' | 'CAT_8' | 'CAT_9' | 'CAT_10';
export type RwyccValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FaunaEventType = 'AVISTAMENTO' | 'COLISAO';

/** SESCINC: tempo-resposta máximo de 3 minutos (180s) do acionamento até a aplicação do agente. */
export const SESCINC_MAX_RESPONSE_SECONDS = 180;

/** Pista: IRI longitudinal ≤ 2,5 m/km e macrotextura ≥ 0,60 mm (IS 153.203-001/205-001). */
export const IRI_MAX_M_KM = 2.5;
export const MACROTEXTURE_MIN_MM = 0.6;

/** RWYCC varia de 0 a 6 (IS 153.133-001). */
export const RWYCC_MIN = 0;
export const RWYCC_MAX = 6;

/** Relatório quadrimestral do SGSO (IS 153.51-001): 20/01, 20/05 e 20/09. */
export const SGSO_QUARTERLY_REPORT_DATES = [
  { month: 1, day: 20 },
  { month: 5, day: 20 },
  { month: 9, day: 20 },
] as const;

/** Checklists de inspeção retidos por 6 meses; ações corretivas de engenharia em 12 meses. */
export const INSPECTION_RETENTION_MONTHS = 6;
export const ENGINEERING_ACTION_MONTHS = 12;

/** Manutenção aeroportuária: 8 áreas (IS 153-002). */
export const MAINTENANCE_AREAS = [
  'PISTA',
  'TAXIWAY',
  'PATIO',
  'SINALIZACAO',
  'ILUMINACAO',
  'ELETRICA',
  'EQUIPAMENTOS',
  'VEICULOS',
] as const;

/** Matriz RCAM simplificada: contaminante → RWYCC (IS 153.133-001). */
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

export const PHASE_7_AERODROMES_EVENTS = {
  AERODROME_REGISTERED: 'AERODROME_REGISTERED',
  RUNWAY_PAVEMENT_REGISTERED: 'RUNWAY_PAVEMENT_REGISTERED',
  RCR_ISSUED: 'RCR_ISSUED',
  RCR_SENT_TO_TWR: 'RCR_SENT_TO_TWR',
  FIRE_RESPONSE_RECORDED: 'FIRE_RESPONSE_RECORDED',
  FIRE_RESPONSE_DEVIATION: 'FIRE_RESPONSE_DEVIATION',
  FIRE_CAT_DOWNGRADE: 'FIRE_CAT_DOWNGRADE',
  FAUNA_EVENT_RECORDED: 'FAUNA_EVENT_RECORDED',
  FAUNA_SENT_TO_SIGRA: 'FAUNA_SENT_TO_SIGRA',
  SGSO_REPORT_DUE: 'SGSO_REPORT_DUE',
} as const;