// ------------------------------------------------------------------
// EXTERNAL INTEGRATIONS — types, event types, constants
// ANAC (RAB/SEI/S141/SIGRA), Asaas (payments), Resend (email), Sentry
// ------------------------------------------------------------------

/* ── RAB validation ─────────────────────────────────────────────── */
export const RAB_STATUS = {
  VALID: 'VALID',
  INVALID_REGISTRATION: 'INVALID_REGISTRATION',
  NAME_MISMATCH: 'NAME_MISMATCH',
  REGISTRATION_INACTIVE: 'REGISTRATION_INACTIVE',
} as const;
export type RabValidationStatus = (typeof RAB_STATUS)[keyof typeof RAB_STATUS];

export const RAB_SOURCES = ['SCRAPING', 'MANUAL', 'CACHED'] as const;
export type RabSource = (typeof RAB_SOURCES)[number];

export interface RabValidationInput {
  matricula: string; // PP-EPT
  owner_name: string;
  owner_cpf?: string;
  owner_cnpj?: string;
}

export interface RabValidationResult {
  status: RabValidationStatus;
  source: RabSource;
  matricula: string;
  owner_on_record: string;
  cached_at?: string;
}

/* ── Asaas payments ─────────────────────────────────────────────── */
export const PAYMENT_METHODS = ['PIX', 'BOLETO', 'CARTAO'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ASAAS_WEBHOOK_EVENTS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_DELETED',
  'INVOICE_UPDATED',
] as const;
export type AsaasWebhookEvent = (typeof ASAAS_WEBHOOK_EVENTS)[number];

export interface CreateAsaasPaymentInput {
  customer_id: string;
  amount: number;
  method: PaymentMethod;
  due_date: string;
  description: string;
  external_reference?: string;
}

export interface AsaasPaymentResult {
  id: string;
  status: string;
  amount: number;
  method: PaymentMethod;
  payment_url?: string;
  pix_qr_code?: string;
  boleto_url?: string;
}

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  id: string;
  payment?: { id: string; status: string; value: number };
  subscription?: { id: string; status: string };
  dateCreated: string;
}

/* ── Resend email ───────────────────────────────────────────────── */
export const EMAIL_TEMPLATES = [
  'WELCOME',
  'PASSWORD_RESET',
  'LISTING_PUBLISHED',
  'ORDER_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'CERTIFICATION_EXPIRING',
  'DISPATCH_BLOCKED',
  'ALERT_CRITICAL',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export interface SendEmailInput {
  to: string | string[];
  template: EmailTemplate;
  variables: Record<string, unknown>;
  from?: string;
}

export interface SendEmailResult {
  id: string;
  sent: boolean;
  queued?: boolean;
}

/* ── Sentry error context ───────────────────────────────────────── */
export interface SentryErrorContext {
  module: string;
  action: string;
  tenant_id?: string;
  user_id?: string;
  request_id?: string;
  extra?: Record<string, unknown>;
}

/* ── circuit breaker ────────────────────────────────────────────── */
export const CIRCUIT_BREAKER = {
  FAILURE_THRESHOLD: 3,
  RESET_TIMEOUT_MS: 60_000,
  HALF_OPEN_MAX_CALLS: 1,
} as const;

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/* ── ledger event types ─────────────────────────────────────────── */
export const INTEGRATION_EVENTS = {
  RAB_VALIDATED: 'integration.rab.validated',
  RAB_VALIDATION_FAILED: 'integration.rab.validation_failed',
  PAYMENT_INITIATED: 'integration.asaas.payment_initiated',
  PAYMENT_RECEIVED: 'integration.asaas.payment_received',
  PAYMENT_FAILED: 'integration.asaas.payment_failed',
  EMAIL_SENT: 'integration.resend.email_sent',
  EMAIL_FAILED: 'integration.resend.email_failed',
  WEBHOOK_RECEIVED: 'integration.webhook.received',
  WEBHOOK_DUPLICATE: 'integration.webhook.duplicate',
  CIRCUIT_BREAKER_OPENED: 'integration.circuit_breaker.opened',
} as const;
