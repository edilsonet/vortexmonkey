// ------------------------------------------------------------------
// BRE — BUSINESS RULES ENGINE (Motor de Regras Declarativo)
// Centraliza TODAS as regras de negócio; nenhuma hardcoded.
// ------------------------------------------------------------------

/* ── severity ───────────────────────────────────────────────────── */
export const RULE_SEVERITIES = ['BLOCKING', 'CRITICAL', 'WARNING', 'INFO'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

/* ── rule status ────────────────────────────────────────────────── */
export const RULE_STATUSES = ['ACTIVE', 'DISABLED', 'TEST'] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

/* ── evaluation result ──────────────────────────────────────────── */
export const EVAL_RESULTS = ['ALLOW', 'DENY', 'ALERT'] as const;
export type EvalResult = (typeof EVAL_RESULTS)[number];

/* ── rule codes (canonical list) ────────────────────────────────── */
export const RULE_CODES = {
  ACCREDITATION_EXPIRED: 'ACCREDITATION_EXPIRED',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  TOXICOLOGICAL_EXPIRED: 'TOXICOLOGICAL_EXPIRED',
  MEL_ITEM_EXPIRED: 'MEL_ITEM_EXPIRED',
  DA_PENDING: 'DA_PENDING',
  FUEL_INSUFFICIENT: 'FUEL_INSUFFICIENT',
  TOOL_CALIBRATION_EXPIRED: 'TOOL_CALIBRATION_EXPIRED',
  PART_RED_TAG: 'PART_RED_TAG',
  CRS_WITHOUT_SIGNATURE: 'CRS_WITHOUT_SIGNATURE',
  SEGVOO_REQUIRED: 'SEGVOO_REQUIRED',
  AIRCRAFT_RAB_MISMATCH: 'AIRCRAFT_RAB_MISMATCH',
  LISTING_WITHOUT_INVENTORY: 'LISTING_WITHOUT_INVENTORY',
  ENROLLMENT_DOUBLE_PERIOD: 'ENROLLMENT_DOUBLE_PERIOD',
  SESCINC_RESPONSE_OVER_LIMIT: 'SESCINC_RESPONSE_OVER_LIMIT',
} as const;
export type RuleCode = (typeof RULE_CODES)[keyof typeof RULE_CODES];

/* ── rule definition ────────────────────────────────────────────── */
export interface BreRule {
  code: RuleCode;
  severity: RuleSeverity;
  description: string;
  module: string;
  params: Record<string, unknown>;
  status: RuleStatus;
}

/* ── evaluation context ─────────────────────────────────────────── */
export interface EvalContext {
  tenant_id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, unknown>;
}

/* ── evaluation output ──────────────────────────────────────────── */
export interface EvalOutput {
  rule_code: RuleCode;
  result: EvalResult;
  message: string;
  params_used: Record<string, unknown>;
}

/* ── default rules seed ─────────────────────────────────────────── */
export const DEFAULT_BRE_RULES: BreRule[] = [
  {
    code: 'ACCREDITATION_EXPIRED',
    severity: 'BLOCKING',
    description: 'Credenciamento expirado (>3 anos) → bloqueio automático; alerta 60 dias antes.',
    module: 'identity',
    params: { validYears: 3, alertDays: 60 },
    status: 'ACTIVE',
  },
  {
    code: 'LICENSE_EXPIRED',
    severity: 'BLOCKING',
    description: 'Licença/CMA/credenciamento vencido → bloqueio do profissional.',
    module: 'identity',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'TOXICOLOGICAL_EXPIRED',
    severity: 'BLOCKING',
    description: 'Exame toxicológico vencido (>90 dias) → bloqueio da função ARSO.',
    module: 'compliance',
    params: { validDays: 90 },
    status: 'ACTIVE',
  },
  {
    code: 'MEL_ITEM_EXPIRED',
    severity: 'BLOCKING',
    description: 'Item MEL vencido → bloqueio do voo (IS 91-012).',
    module: 'operators',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'DA_PENDING',
    severity: 'BLOCKING',
    description: 'DA aplicável pendente → prevalece sobre a MEL.',
    module: 'operators',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'FUEL_INSUFFICIENT',
    severity: 'BLOCKING',
    description: 'Combustível abaixo do mínimo regulamentar → despacho bloqueado.',
    module: 'operators',
    params: { vfrMinutes: 30, ifrMinutes: 45 },
    status: 'ACTIVE',
  },
  {
    code: 'TOOL_CALIBRATION_EXPIRED',
    severity: 'BLOCKING',
    description: 'Ferramenta com calibração vencida → bloqueio de uso na OS.',
    module: 'maintenance',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'PART_RED_TAG',
    severity: 'BLOCKING',
    description: 'Peça com etiqueta vermelha → bloqueio de instalação.',
    module: 'maintenance',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'CRS_WITHOUT_SIGNATURE',
    severity: 'BLOCKING',
    description: 'OS não aprovada para retorno sem assinatura de profissional habilitado.',
    module: 'maintenance',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'SEGVOO_REQUIRED',
    severity: 'BLOCKING',
    description: 'Grande reparo/alteração → SEGVOO 001 antes do retorno.',
    module: 'maintenance',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'AIRCRAFT_RAB_MISMATCH',
    severity: 'BLOCKING',
    description: 'Matrícula de aeronave deve bater com o RAB (fonte ANAC).',
    module: 'operators',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'LISTING_WITHOUT_INVENTORY',
    severity: 'BLOCKING',
    description: 'Anúncio da RLoja é visão do estoque — sem item, sem anúncio.',
    module: 'rloja',
    params: {},
    status: 'ACTIVE',
  },
  {
    code: 'ENROLLMENT_DOUBLE_PERIOD',
    severity: 'BLOCKING',
    description: 'Matrícula no dobro do período letivo → cancelamento (S141).',
    module: 'training',
    params: { maxPeriods: 2 },
    status: 'ACTIVE',
  },
  {
    code: 'SESCINC_RESPONSE_OVER_LIMIT',
    severity: 'CRITICAL',
    description: 'Tempo-resposta SESCINC > 3 minutos → alerta crítico.',
    module: 'training',
    params: { maxSeconds: 180 },
    status: 'ACTIVE',
  },
];

/* ── ledger event types ─────────────────────────────────────────── */
export const BRE_EVENTS = {
  RULE_EVALUATED: 'bre.rule.evaluated',
  RULE_CREATED: 'bre.rule.created',
  RULE_UPDATED: 'bre.rule.updated',
  RULE_DISABLED: 'bre.rule.disabled',
  BLOCKING_TRIGGERED: 'bre.blocking.triggered',
} as const;
