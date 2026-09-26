import { IsEnum, IsInt, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import type { SubscriptionPlan, InvoiceBillingType } from '@vortex/contracts-be';

export class CreateTenantDto {
  @IsString()
  name!: string;

  @IsEnum(['ERP', 'RH', 'CRM', 'LOJA', 'OPERADORES', 'MANUTENCAO', 'INSTRUCAO'])
  type!: 'ERP' | 'RH' | 'CRM' | 'LOJA' | 'OPERADORES' | 'MANUTENCAO' | 'INSTRUCAO';

  @IsUUID()
  ownerCompanyId!: string;
}

export class AddTenantUserDto {
  @IsUUID()
  userId!: string;

  @IsEnum(['ADMIN', 'USER'])
  role!: 'ADMIN' | 'USER';
}

export class CreateSubscriptionDto {
  @IsUUID()
  tenantId!: string;

  @IsEnum(['STARTER', 'PRO', 'ENTERPRISE'])
  plan!: SubscriptionPlan;
}

export class CalculateCommissionDto {
  @IsEnum(['MARKETPLACE', 'RECRUITMENT'])
  context!: 'MARKETPLACE' | 'RECRUITMENT';

  @IsNumber()
  @Min(0)
  totalValueCents!: number;

  @IsUUID()
  sellerOrEmployerId!: string;
}

export class AsaasWebhookDto {
  @IsString()
  event!: string;

  @IsString()
  paymentId!: string;

  @IsUUID()
  tenantId!: string;

  @IsInt()
  amountCents!: number;

  @IsEnum(['PIX', 'BOLETO', 'CREDIT_CARD'])
  billingType!: InvoiceBillingType;
}
