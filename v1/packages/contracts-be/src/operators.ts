// VORTEX — Fase 6: ERP de Operadores Aéreos e Aeroagrícola
// RBAC 91, 119, 121, 135 e 137 — tipos, constantes regulatórias e eventos.

export type OperatorType = 'RBAC_91' | 'RBAC_121' | 'RBAC_135' | 'RBAC_137';
export type CertificationPhase = 'FASE_1' | 'FASE_2' | 'FASE_3' | 'FASE_4' | 'FASE_5' | 'CERTIFICADO';
export type OperatorStatus = 'ATIVO' | 'SUSPENSO' | 'CANCELADO';
export type FleetStatus = 'OPERACIONAL' | 'INOPERANTE' | 'BAIXADA';
export type AircraftCategory = 'AVIAO' | 'HELICOPTERO' | 'JATO' | 'TURBOELICE';
export type MelCategory = 'CAT_A' | 'CAT_B' | 'CAT_C' | 'CAT_D';
export type MelStatus = 'OPERACIONAL' | 'DIFERIDO' | 'EXPIRADO' | 'REPARADO';
export type LogbookEntryType = 'flight' | 'ground_run';
export type LogbookPilotFuncao = 'PIC' | 'SIC' | 'INSP' | 'INSTR';
export type LogbookStatus = 'draft' | 'signed' | 'rectified' | 'voided';
export type FlightRule = 'VFR' | 'IFR';
export type DispatchStatus = 'RASCUNHO' | 'VALIDADO' | 'LIBERADO' | 'BLOQUEADO' | 'EXECUTADO';
export type ManualType = 'MGO' | 'AOM' | 'MCMSV' | 'MGM' | 'PTO' | 'SOP' | 'MIP';
export type ManualApprovalStatus = 'MINUTA' | 'SUBMETIDO' | 'APROVADO' | 'ACEITO' | 'REJEITADO' | 'REVOGADO';
export type AgriOperatorStatus = 'ATIVO' | 'SUSPENSO' | 'CASSADO' | 'DESISTENTE';
export type DisperserType = 'SOLIDOS' | 'LIQUIDOS' | 'GRANULARES';
export type DisperserStatus = 'OPERACIONAL' | 'CALIBRACAO_VENCIDA' | 'INOPERANTE';
export type CvaStatus = 'NAO_EMITIDO' | 'VALIDO' | 'VENCIDO' | 'BLOQUEADO';

/** Prazo de diferimento MEL por categoria (IS 91-012): A = especificado no item, B = 3d, C = 10d, D = 120d. */
export const MEL_CATEGORY_DAYS: Record<MelCategory, number | null> = {
  CAT_A: null, // prazo especificado pelo próprio item
  CAT_B: 3, // 72h
  CAT_C: 10, // 240h
  CAT_D: 120,
};

/** Reserva regulamentar de combustível (minutos) — RBAC 135. */
export const FUEL_MINUTES = {
  VFR_AVIAO_DIA: 30, // avião VFR dia: +30 min
  VFR_AVIAO_NOITE: 45, // avião VFR noite: +45 min
  VFR_HELICOPTERO: 20, // helicóptero VFR: +20 min
  IFR_SEM_ALTERNATIVA: 120, // IFR sem alternativa: 2 horas sobre o destino (turboélice/jato)
  IFR_COM_ALTERNATIVA: 45, // IFR com alternativa: reserva padrão de 45 min
} as const;

/** Repeso de frota a cada 36 meses (até 9 assentos) — IS 135-21-001. */
export const REWEIGH_MONTHS = 36;

/** CVA — Certificado de Verificação de Aeronavegabilidade (IS 91-403-001): 365 dias, alerta 30 dias antes. */
export const CVA_VALIDITY_DAYS = 365;
export const CVA_ALERT_DAYS = 30;

/** ETOPS (IS 121-012): retenção de registros 207 min por 5 anos. */
export const ETOPS_RETENTION_MINUTES = 207;
export const ETOPS_RETENTION_YEARS = 5;

/** Margem de desempenho sem met: temperatura máxima prevista (±3h) + 4°C. */
export const PERFORMANCE_MARGIN_C = 4;

/** Gatilhos PAADV: +5°C, -5 hPa, variação de vento > 1%. */
export const PAADV_TEMP_DELTA_C = 5;
export const PAADV_QNH_DELTA_HPA = 5;
export const PAADV_WIND_VARIATION = 0.01;

export const PHASE_6_OPERATORS_EVENTS = {
  OPERATOR_REGISTERED: 'OPERATOR_REGISTERED',
  OPERATOR_CERTIFICATION_UPDATED: 'OPERATOR_CERTIFICATION_UPDATED',
  FLEET_ADDED: 'FLEET_ADDED',
  MEL_ITEM_CREATED: 'MEL_ITEM_CREATED',
  MEL_ITEM_DEFERRED: 'MEL_ITEM_DEFERRED',
  MEL_ITEM_REPAIRED: 'MEL_ITEM_REPAIRED',
  LOGBOOK_ENTRY_CREATED: 'LOGBOOK_ENTRY_CREATED',
  LOGBOOK_SIGNED: 'LOGBOOK_SIGNED',
  LOGBOOK_ENDORSED: 'LOGBOOK_ENDORSED',
  LOGBOOK_RECTIFIED: 'LOGBOOK_RECTIFIED',
  LOGBOOK_VOIDED: 'LOGBOOK_VOIDED',
  DISPATCH_CREATED: 'DISPATCH_CREATED',
  DISPATCH_VALIDATED: 'DISPATCH_VALIDATED',
  DISPATCH_BLOCKED: 'DISPATCH_BLOCKED',
  DISPATCH_RELEASED: 'DISPATCH_RELEASED',
  MANUAL_CREATED: 'MANUAL_CREATED',
  AGRI_OPERATOR_REGISTERED: 'AGRI_OPERATOR_REGISTERED',
  DISPERSER_REGISTERED: 'DISPERSER_REGISTERED',
  DISPERSER_BLOCKED: 'DISPERSER_BLOCKED',
  CVA_RECORDED: 'CVA_RECORDED',
  CVA_BLOCKED: 'CVA_BLOCKED',
} as const;