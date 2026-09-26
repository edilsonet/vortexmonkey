export type Severity = "INFO" | "WARNING" | "CRITICAL" | "BLOCKING";

export type Evaluation = { allowed: boolean; severity: Severity; code: string; message: string };

export function evaluateRule(code: string, ctx: Record<string, unknown>): Evaluation {
  if (code === "LISTING_WITHOUT_INVENTORY") {
    const id = String(ctx.inventoryItemId ?? "");
    if (!id) {
      return { allowed: false, severity: "BLOCKING", code, message: "Anuncio exige item de estoque." };
    }
    return { allowed: true, severity: "INFO", code, message: "ok" };
  }
  if (code === "SESCINC_RESPONSE_OVER_LIMIT") {
    const seconds = Number(ctx.responseTimeSeconds ?? 0);
    if (seconds > 180) {
      return { allowed: false, severity: "CRITICAL", code, message: "SESCINC acima de 180s." };
    }
    return { allowed: true, severity: "INFO", code, message: "ok" };
  }
  if (code === "ENROLLMENT_DOUBLE_PERIOD") {
    if (ctx.overdue === true) {
      return { allowed: false, severity: "BLOCKING", code, message: "Aluno no dobro do periodo letivo." };
    }
    return { allowed: true, severity: "INFO", code, message: "ok" };
  }
  return { allowed: true, severity: "INFO", code, message: "Regra desconhecida; fluxo nao bloqueado." };
}
