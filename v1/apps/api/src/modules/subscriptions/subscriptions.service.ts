import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  COMMISSION_RATES,
  PHASE_4_SUBSCRIPTION_EVENTS,
  PLAN_LIMITS,
  type SubscriptionPlan,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type {
  AddTenantUserDto,
  AsaasWebhookDto,
  CalculateCommissionDto,
  CreateSubscriptionDto,
  CreateTenantDto,
} from './subscriptions.dto';

interface SubscriptionRow {
  id: string; tenant_id: string; plan: SubscriptionPlan; status: string;
  started_at: Date; renews_at: Date | null; overdue_since: Date | null;
  ledger_block_id: string; created_at: Date;
}

interface TenantRow {
  id: string; name: string; type: string; owner_company_id: string; status: string; created_at: Date;
}

@Injectable()
export class SubscriptionsService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /** POST /tenants */
  public async createTenant(context: RequestContext, dto: CreateTenantDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const tenantId = randomUUID();
      const ledgerId = randomUUID();

      await client.query<TenantRow>(
        `INSERT INTO subscriptions.tenants (id, name, type, owner_company_id, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`,
        [tenantId, dto.name, dto.type, dto.ownerCompanyId],
      );

      // Adiciona o usuário criador como ADMIN do tenant
      await client.query(
        `INSERT INTO subscriptions.tenant_users (tenant_id, user_id, role)
         VALUES ($1, $2, 'ADMIN')`,
        [tenantId, context.userId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'TENANT', entityId: tenantId,
        actionType: PHASE_4_SUBSCRIPTION_EVENTS.TENANT_CREATED,
        payload: { tenantId, name: dto.name, type: dto.type, ownerCompanyId: dto.ownerCompanyId },
      });

      return { tenantId, name: dto.name, type: dto.type, ownerCompanyId: dto.ownerCompanyId };
    });
  }

  /** POST /tenants/:id/users */
  public async addUserToTenant(context: RequestContext, tenantId: string, dto: AddTenantUserDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // Verificar limites do plano do tenant
      const activeSub = await this.getActiveSubscription(client, tenantId);
      const limits = PLAN_LIMITS[activeSub.plan];

      const currentUsersCountRow = (await client.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM subscriptions.tenant_users WHERE tenant_id = $1',
        [tenantId],
      )).rows[0];
      const currentCount = Number(currentUsersCountRow?.count ?? 0);

      if (currentCount >= limits.maxUsers) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: `Limite de usuários excedido para o plano ${activeSub.plan} (Máximo: ${limits.maxUsers}).`,
        });
      }

      await client.query(
        `INSERT INTO subscriptions.tenant_users (tenant_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [tenantId, dto.userId, dto.role],
      );

      return { tenantId, userId: dto.userId, role: dto.role };
    });
  }

  /** POST /subscriptions */
  public async createSubscription(context: RequestContext, dto: CreateSubscriptionDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const existingSub = (await client.query<SubscriptionRow>(
        `SELECT * FROM subscriptions.subscriptions WHERE tenant_id = $1 AND status IN ('ACTIVE','OVERDUE')`,
        [dto.tenantId],
      )).rows[0];

      if (existingSub) {
        throw new ConflictException({
          code: 'VALIDATION_ERROR',
          message: 'Tenant já possui uma assinatura ativa ou em atraso.',
        });
      }

      const subId = randomUUID();
      const ledgerId = randomUUID();
      const renewsAt = new Date(Date.now() + 30 * 86400_000); // 30 dias

      const result = await client.query<SubscriptionRow>(
        `INSERT INTO subscriptions.subscriptions (id, tenant_id, plan, status, renews_at, ledger_block_id)
         VALUES ($1, $2, $3, 'ACTIVE', $4, $5) RETURNING *`,
        [subId, dto.tenantId, dto.plan, renewsAt, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'SUBSCRIPTION', entityId: subId,
        actionType: PHASE_4_SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED,
        payload: { subscriptionId: subId, tenantId: dto.tenantId, plan: dto.plan, limits: PLAN_LIMITS[dto.plan] },
      });

      return result.rows[0];
    });
  }

  /** GET /subscriptions/usage — Medição de eventos do Ledger por tenant/mês. */
  public async getUsage(context: RequestContext, tenantId: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const sub = await this.getActiveSubscription(client, tenantId);
      const limits = PLAN_LIMITS[sub.plan];

      const period = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      const ledgerEventsRow = (await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM ledger.ledger_blocks
         WHERE tenant_id = $1 AND to_char(timestamp, 'YYYY-MM') = $2`,
        [tenantId, period],
      )).rows[0];

      const activeUsersRow = (await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM subscriptions.tenant_users WHERE tenant_id = $1`,
        [tenantId],
      )).rows[0];

      const ledgerEventCount = Number(ledgerEventsRow?.count ?? 0);
      const activeUsersCount = Number(activeUsersRow?.count ?? 0);

      return {
        tenantId,
        plan: sub.plan,
        period,
        usage: {
          ledgerEventsThisMonth: ledgerEventCount,
          activeUsers: activeUsersCount,
          maxUsersAllowed: limits.maxUsers,
          maxCompaniesAllowed: limits.maxCompanies,
          storageBytesAllowed: limits.storageBytes,
        },
      };
    });
  }

  /** Cálculo de Comissão de 3% (Marketplace RLoja / Recrutamento) */
  public calculateCommission(dto: CalculateCommissionDto): {
    context: string;
    totalValueCents: number;
    commissionCents: number;
    chargedToRole: string;
    guaranteeNote?: string;
  } {
    const rate = dto.context === 'MARKETPLACE'
      ? COMMISSION_RATES.MARKETPLACE_SELLER_PERCENT
      : COMMISSION_RATES.RECRUITMENT_EMPLOYER_PERCENT;

    const commissionCents = Math.round(dto.totalValueCents * rate);
    const chargedToRole = dto.context === 'MARKETPLACE' ? 'VENDEDOR' : 'CONTRATANTE';

    const result: any = {
      context: dto.context,
      totalValueCents: dto.totalValueCents,
      commissionCents,
      chargedToRole,
    };

    if (dto.context === 'RECRUITMENT') {
      result.guaranteeNote = `Garantia de reposição de ${COMMISSION_RATES.RECRUITMENT_REPLACEMENT_GUARANTEE_DAYS} dias inclusa. Candidato isento de taxas.`;
    } else {
      result.guaranteeNote = 'Comprador isento de taxas de comissão.';
    }

    return result;
  }

  /** POST /subscriptions/webhook/asaas — Webhook de cobrança recorrente idempotente */
  public async handleAsaasWebhook(context: RequestContext, dto: AsaasWebhookDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const ledgerId = randomUUID();

      if (dto.event === 'PAYMENT_RECEIVED' || dto.event === 'PAYMENT_CONFIRMED') {
        await client.query(
          `INSERT INTO subscriptions.asaas_invoices (tenant_id, external_id, amount_cents, status, billing_type, due_date, paid_at, ledger_block_id)
           VALUES ($1, $2, $3, 'PAID', $4, CURRENT_DATE, now(), $5)
           ON CONFLICT (external_id) DO UPDATE SET status = 'PAID', paid_at = now()`,
          [dto.tenantId, dto.paymentId, dto.amountCents, dto.billingType, ledgerId],
        );

        // Desbloqueia subscrição se estiver em atraso
        await client.query(
          `UPDATE subscriptions.subscriptions
           SET status = 'ACTIVE', overdue_since = NULL, renews_at = now() + INTERVAL '30 days'
           WHERE tenant_id = $1`,
          [dto.tenantId],
        );

        await this.ledger.append(client, context, {
          id: ledgerId, entityType: 'INVOICE', entityId: dto.paymentId,
          actionType: PHASE_4_SUBSCRIPTION_EVENTS.INVOICE_PAID,
          payload: { paymentId: dto.paymentId, tenantId: dto.tenantId, amountCents: dto.amountCents },
        });

        return { status: 'PAID', tenantId: dto.tenantId, paymentId: dto.paymentId };
      }

      if (dto.event === 'PAYMENT_OVERDUE') {
        await client.query(
          `INSERT INTO subscriptions.asaas_invoices (tenant_id, external_id, amount_cents, status, billing_type, due_date, ledger_block_id)
           VALUES ($1, $2, $3, 'OVERDUE', $4, CURRENT_DATE, $5)
           ON CONFLICT (external_id) DO UPDATE SET status = 'OVERDUE'`,
          [dto.tenantId, dto.paymentId, dto.amountCents, dto.billingType, ledgerId],
        );

        // Regra de tolerância de 7 dias
        const sub = await this.getActiveSubscription(client, dto.tenantId);
        const overdueSince = sub.overdue_since ?? new Date();

        const daysOverdue = Math.floor((Date.now() - new Date(overdueSince).getTime()) / 86400_000);
        const newStatus = daysOverdue >= 7 ? 'BLOCKED' : 'OVERDUE';

        await client.query(
          `UPDATE subscriptions.subscriptions
           SET status = $2, overdue_since = COALESCE(overdue_since, now())
           WHERE id = $1`,
          [sub.id, newStatus],
        );

        await this.ledger.append(client, context, {
          id: ledgerId, entityType: 'INVOICE', entityId: dto.paymentId,
          actionType: newStatus === 'BLOCKED' ? PHASE_4_SUBSCRIPTION_EVENTS.MODULE_BLOCKED : PHASE_4_SUBSCRIPTION_EVENTS.INVOICE_OVERDUE,
          payload: { paymentId: dto.paymentId, tenantId: dto.tenantId, daysOverdue, newStatus },
        });

        return { status: newStatus, daysOverdue };
      }

      return { processed: false, reason: `Evento ${dto.event} não afeta status` };
    });
  }

  private async getActiveSubscription(client: { query: DatabaseService['query'] }, tenantId: string): Promise<SubscriptionRow> {
    const sub = (await client.query<SubscriptionRow>(
      `SELECT * FROM subscriptions.subscriptions WHERE tenant_id = $1 AND status IN ('ACTIVE','OVERDUE','BLOCKED') ORDER BY created_at DESC LIMIT 1`,
      [tenantId],
    )).rows[0];
    if (!sub) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Nenhuma assinatura encontrada para o tenant.' });
    }
    return sub;
  }
}
