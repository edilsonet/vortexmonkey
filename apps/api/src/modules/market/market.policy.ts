export const COMMISSION_RATE = 0.03;
export const PRODUCT_CATEGORIES = [
  "AERONAVE",
  "MOTOR",
  "HELICE",
  "RADIO",
  "INSTRUMENTO",
  "ACESSORIO",
  "PECA",
  "CONSUMIVEL",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ListingStatus = "RASCUNHO" | "PUBLICADO" | "PAUSADO" | "VENDIDO" | "CANCELADO";
export type ListingOrigin = "EMPRESA" | "PARTICULAR";

export function commissionOfSale(grossBrl: number, rate = COMMISSION_RATE): number {
  if (grossBrl < 0) throw new Error("Valor bruto invalido.");
  return Number((grossBrl * rate).toFixed(2));
}

export function buyerCharge(_grossBrl: number): number {
  return 0;
}

export function assertListable(input: { itemId: string; status: string; quantity: number }): void {
  if (!input.itemId) throw new Error("Anuncio exige item de estoque.");
  if (input.status === "QUARANTINE") throw new Error("Peca em quarentena ou etiqueta vermelha nao pode ser anunciada.");
  if (input.status === "SOLD") throw new Error("Item vendido nao pode ser anunciado.");
  if (input.status !== "AVAILABLE" && input.status !== "RESERVED") {
    throw new Error("Item indisponivel para anuncio.");
  }
  if (input.quantity <= 0) throw new Error("Quantidade insuficiente.");
}

export function canPublish(input: { status: ListingStatus; adminApproved: boolean }): boolean {
  return input.status === "RASCUNHO" && input.adminApproved;
}

export const PHASE_8_MARKET_EVENTS = {
  LISTING_CREATED: "LISTING_CREATED",
  LISTING_PUBLISHED: "LISTING_PUBLISHED",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_PAID: "ORDER_PAID",
  COMMISSION_REGISTERED: "COMMISSION_REGISTERED",
} as const;
