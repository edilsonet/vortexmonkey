// ------------------------------------------------------------------
// RLOJA (MARKETPLACE B2B) — types, constants, events
// Anúncio é VISÃO do estoque; 3% comissão cobrada do vendedor.
// ------------------------------------------------------------------

/* ── categories ─────────────────────────────────────────────────── */
export const PRODUCT_CATEGORIES = [
  'AERONAVE',
  'MOTOR',
  'HELICE',
  'RADIO',
  'INSTRUMENTO',
  'ACESSORIO',
  'PECA',
  'CONSUMIVEL',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/* ── listing status ─────────────────────────────────────────────── */
export const LISTING_STATUSES = [
  'RASCUNHO',
  'PUBLICADO',
  'PAUSADO',
  'VENDIDO',
  'CANCELADO',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/* ── order status ───────────────────────────────────────────────── */
export const ORDER_STATUSES = [
  'PENDENTE',
  'PAGO',
  'CONCLUIDO',
  'CANCELADO',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/* ── listing origin ─────────────────────────────────────────────── */
export const LISTING_ORIGINS = ['EMPRESA', 'PARTICULAR'] as const;
export type ListingOrigin = (typeof LISTING_ORIGINS)[number];

/* ── constants ──────────────────────────────────────────────────── */
export const COMMISSION_PERCENT = 3.0;
export const DEFAULT_CURRENCY = 'BRL';
export const RLOJA_SEARCH_TIMEOUT_MS = 200;

/* ── ledger event types ─────────────────────────────────────────── */
export const RLOJA_EVENTS = {
  LISTING_CREATED: 'rloja.listing.created',
  LISTING_PUBLISHED: 'rloja.listing.published',
  LISTING_PAUSED: 'rloja.listing.paused',
  LISTING_CANCELLED: 'rloja.listing.cancelled',
  LISTING_SOLD: 'rloja.listing.sold',
  ORDER_CREATED: 'rloja.order.created',
  ORDER_PAID: 'rloja.order.paid',
  ORDER_COMPLETED: 'rloja.order.completed',
  ORDER_CANCELLED: 'rloja.order.cancelled',
  COMMISSION_REGISTERED: 'rloja.commission.registered',
} as const;

/* ── interfaces ─────────────────────────────────────────────────── */
export interface CreateListingInput {
  inventory_item_id: string;
  origin: ListingOrigin;
  category: ProductCategory;
  title: string;
  description?: string;
  price: number;
}

export interface ListingCreatedEvent {
  listing_id: string;
  tenant_id: string;
  inventory_item_id: string;
  origin: ListingOrigin;
  category: ProductCategory;
  price: number;
}

export interface CreateOrderInput {
  listing_id: string;
  buyer_company_id?: string;
  buyer_person_id?: string;
}

export interface OrderCreatedEvent {
  order_id: string;
  tenant_id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  commission_amount: number;
}

/* ── validation result ──────────────────────────────────────────── */
export interface ListingValidationResult {
  success: boolean;
  error?: string;
}
