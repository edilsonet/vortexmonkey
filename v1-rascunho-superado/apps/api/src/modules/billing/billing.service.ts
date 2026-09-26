import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import { assertSellable, commissionOf, COMMISSION_RATE, hidesAds, periodEnd } from "./billing.policy.ts";
import type { RecordCommissionDto, SubscribeDto } from "./billing.dto.ts";

@Injectable()
export class BillingService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public products() {
    return this.db.query(
      `SELECT id, code, name, kind, price_brl, billed, sellable
       FROM subscriptions.products WHERE sellable = true ORDER BY kind, name`,
    ).then((r) => r.rows);
  }

  public mine(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const subs = await client.query(
        `SELECT s.id, s.status, s.started_at, s.current_period_end, p.code, p.name, p.kind, p.price_brl
         FROM subscriptions.subscriptions s
         JOIN subscriptions.products p ON p.id = s.product_id
         WHERE s.person_id = $1
         ORDER BY s.created_at DESC`,
        [ctx.personId],
      );
      const codes = subs.rows.filter((r) => r.status === "ACTIVE").map((r) => String(r.code));
      return { subscriptions: subs.rows, ads: !hidesAds(codes), productCodes: codes };
    });
  }

  public subscribe(ctx: RequestContext, dto: SubscribeDto) {
    try {
      assertSellable(dto.productCode);
    } catch (error) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Produto nao vendido.",
      });
    }
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
    return this.db.withContext(ctx, async (client) => {
      const product = await client.query<{ id: string; price_brl: string; billed: "MONTHLY" | "YEARLY" }>(
        `SELECT id, price_brl, billed FROM subscriptions.products WHERE code = $1 AND sellable = true`,
        [dto.productCode],
      );
      const prod = product.rows[0];
      if (!prod) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Produto indisponivel." });
      }
      const open = await client.query(
        `SELECT 1 FROM subscriptions.subscriptions
         WHERE person_id = $1 AND product_id = $2 AND status IN ('ACTIVE','PAST_DUE','SUSPENDED')`,
        [ctx.personId, prod.id],
      );
      if (open.rowCount) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Assinatura ja ativa para este produto." });
      }
      const end = periodEnd(new Date(), prod.billed);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO subscriptions.subscriptions(tenant_id, person_id, company_id, product_id, status, current_period_end)
         VALUES ($1,$2,$3,$4,'ACTIVE',$5) RETURNING id`,
        [ctx.tenantId, ctx.personId, dto.companyId ?? ctx.companyId, prod.id, end.toISOString()],
      );
      const id = inserted.rows[0]!.id;
      const invoice = await client.query<{ id: string }>(
        `INSERT INTO subscriptions.invoices(tenant_id, subscription_id, amount_brl, status, paid_at)
         VALUES ($1,$2,$3,'PAID', now()) RETURNING id`,
        [ctx.tenantId, id, prod.price_brl],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "SUBSCRIPTION",
        entityId: id,
        actionType: "SUBSCRIBE",
        payload: { productCode: dto.productCode, invoiceId: invoice.rows[0]!.id },
      });
      await client.query("UPDATE subscriptions.subscriptions SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Assinatura ${dto.productCode}`,
        entityType: "SUBSCRIPTION",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number, currentPeriodEnd: end.toISOString() };
    });
  }

  public commissions(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, source, source_id, gross_brl, rate, amount_brl, buyer_exempt, created_at
         FROM subscriptions.commissions
         WHERE seller_person_id = $1 OR tenant_id = $2
         ORDER BY created_at DESC LIMIT 50`,
        [ctx.personId, ctx.tenantId],
      );
      return result.rows;
    });
  }

  public recordCommission(ctx: RequestContext, dto: RecordCommissionDto) {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
    const amount = commissionOf(dto.grossBrl);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO subscriptions.commissions(
           tenant_id, source, source_id, seller_person_id, company_id, gross_brl, rate, amount_brl, buyer_exempt
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
        [
          ctx.tenantId,
          dto.source,
          dto.sourceId,
          ctx.personId,
          dto.companyId ?? ctx.companyId,
          dto.grossBrl,
          COMMISSION_RATE,
          amount,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "COMMISSION",
        entityId: id,
        actionType: dto.source,
        payload: { grossBrl: dto.grossBrl, amount, rate: COMMISSION_RATE, buyerExempt: true },
      });
      await client.query("UPDATE subscriptions.commissions SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, amountBrl: amount, rate: COMMISSION_RATE, buyerExempt: true };
    });
  }
}
