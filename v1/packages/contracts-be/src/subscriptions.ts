export type SubscriptionPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'OVERDUE' | 'BLOCKED' | 'CANCELLED';
export type InvoiceBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface PlanLimits {
  readonly maxCompanies: number;
  readonly maxUsers: number;
  readonly storageBytes: number;
  readonly hasDigitalSignatures: boolean;
  readonly hasApiAccess: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  STARTER: {
    maxCompanies: 1,
    maxUsers: 5,
    storageBytes: 1 * 1024 * 1024 * 1024, // 1GB
    hasDigitalSignatures: false,
    hasApiAccess: false,
  },
  PRO: {
    maxCompanies: 10,
    maxUsers: 50,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    hasDigitalSignatures: true,
    hasApiAccess: false,
  },
  ENTERPRISE: {
    maxCompanies: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
    storageBytes: Number.POSITIVE_INFINITY,
    hasDigitalSignatures: true,
    hasApiAccess: true,
  },
};

/** Diretrizes Comerciais VORTEX — Comissões de 3% */
export const COMMISSION_RATES = {
  MARKETPLACE_SELLER_PERCENT: 0.03, // 3% cobrado do VENDEDOR (comprador isento)
  RECRUITMENT_EMPLOYER_PERCENT: 0.03, // 3% do primeiro salário cobrado do CONTRATANTE (garantia 90 dias)
  RECRUITMENT_REPLACEMENT_GUARANTEE_DAYS: 90,
} as const;

export const PHASE_4_SUBSCRIPTION_EVENTS = {
  TENANT_CREATED: 'TENANT_CREATED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_PAID: 'INVOICE_PAID',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  MODULE_BLOCKED: 'MODULE_BLOCKED',
} as const;
