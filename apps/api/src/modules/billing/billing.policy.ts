export const SELLABLE_CODES = [
  "RCONTA_VIP",
  "RECRUITMENT",
  "ERP_MRO",
  "ERP_OPS",
  "ERP_TRAINING",
  "ERP_AIRPORT",
] as const;

export type ProductCode = (typeof SELLABLE_CODES)[number];

export const CATALOG_CENTRAL_CODE = "CATALOG_CENTRAL";
export const COMMISSION_RATE = 0.03;

export function isSellable(code: string): boolean {
  return (SELLABLE_CODES as readonly string[]).includes(code);
}

export function assertSellable(code: string): void {
  if (code === CATALOG_CENTRAL_CODE || !isSellable(code)) {
    throw new Error("Catalogo Central nao e vendido.");
  }
}

export function commissionOf(grossBrl: number, rate = COMMISSION_RATE): number {
  if (grossBrl < 0) throw new Error("Valor bruto invalido.");
  return Number((grossBrl * rate).toFixed(2));
}

export function hidesAds(codes: readonly string[]): boolean {
  return codes.some((c) => isSellable(c));
}

export function periodEnd(from: Date, billed: "MONTHLY" | "YEARLY"): Date {
  const next = new Date(from.getTime());
  if (billed === "YEARLY") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}
