export const WORK_ORDER_STEPS = [
  "Recebimento",
  "Inspecao inicial",
  "Planejamento",
  "Desmontagem",
  "Reparos",
  "Montagem",
  "Testes",
  "Inspecao final",
  "APRS/CRS",
  "Liberacao",
  "Entrega",
  "Pos-entrega",
] as const;

export const STEP_LABELS: Record<number, string> = Object.fromEntries(
  WORK_ORDER_STEPS.map((label, i) => [i + 1, label]),
) as Record<number, string>;

export const WORK_TYPES = [
  "PREVENTIVA",
  "CORRETIVA",
  "GRANDE_REPARO",
  "GRANDE_ALTERACAO",
  "INSPECAO",
  "REVISAO",
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export function nextStep(current: number): number {
  if (current >= 12) return 12;
  if (current < 1) return 1;
  return current + 1;
}

export function assertAdvance(from: number, to: number): void {
  if (from === 12 && to === 12) return;
  if (to !== from + 1 || to < 1 || to > 12) {
    throw new Error("OS avanca apenas 1 etapa na sequencia 1-12.");
  }
}

export function canIssueCrs(step: number): boolean {
  return step >= 9;
}

export function requiresSegvoo(workType: string): boolean {
  return workType === "GRANDE_REPARO" || workType === "GRANDE_ALTERACAO";
}

export const PART_TAGS = [
  "VERDE_SERVICAVEL",
  "AMARELA_REPARAVEL_INSPECAO",
  "VERMELHA_CONDENADA_NAO_AERONAVEGAVEL",
] as const;

export const TOOL_STATUSES = ["OPERACIONAL", "CALIBRACAO_VENCIDA", "EM_MANUTENCAO", "BAIXADA"] as const;
