import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import {
  assertListable,
  buyerCharge,
  canPublish,
  commissionOfSale,
  PHASE_8_MARKET_EVENTS,
  type ListingStatus,
} from "./market.policy.ts";
import type { CreateListingDto, CreateOrderDto } from "./market.dto.ts";

@Injectable()
export class MarketService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const listings = await client.query(
        `SELECT l.id, l.title, l.category, l.origin, l.price, l.status, l.admin_approved,
                i.sku, i.name AS item_name, i.status AS item_status
         FROM market.listings l
         JOIN stock.items i ON i.id = l.inventory_item_id
         ORDER BY l.created_at DESC`,
      );
      const orders = await client.query(
        `SELECT o.id, o.amount, o.commission_amount, o.buyer_charge, o.status, l.title
         FROM market.orders o JOIN market.listings l ON l.id = o.listing_id
         ORDER BY o.created_at DESC LIMIT 50`,
      );
      const items = await client.query(
        `SELECT i.id, i.sku, i.name, i.status, i.quantity, h.kind
         FROM stock.items i JOIN stock.holdings h ON h.id = i.holding_id
         WHERE i.status = 'AVAILABLE'
         ORDER BY i.created_at DESC LIMIT 50`,
      );
      const counts = await client.query<{ listings: number; published: number; orders: number }>(
        `SELECT
           (SELECT count(*)::int FROM market.listings) AS listings,
           (SELECT count(*)::int FROM market.listings WHERE status = 'PUBLICADO') AS published,
           (SELECT count(*)::int FROM market.orders) AS orders`,
      );
      return { counts: counts.rows[0], listings: listings.rows, orders: orders.rows, items: items.rows };
    });
  }

  public createListing(ctx: RequestContext, dto: CreateListingDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const item = await client.query<{ id: string; status: string; quantity: string; name: string }>(
        "SELECT id, status, quantity::text, name FROM stock.items WHERE id = $1",
        [dto.inventoryItemId],
      );
      const row = item.rows[0];
      if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Item de estoque nao encontrado." });
      try {
        assertListable({ itemId: row.id, status: row.status, quantity: Number(row.quantity) });
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Anuncio bloqueado.",
        });
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO market.listings(
           tenant_id, inventory_item_id, origin, seller_company_id, seller_person_id,
           category, title, description, price
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          ctx.tenantId,
          dto.inventoryItemId,
          dto.origin,
          dto.sellerCompanyId ?? ctx.companyId,
          ctx.personId,
          dto.category,
          dto.title,
          dto.description ?? null,
          dto.price,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "RL_LISTING",
        entityId: id,
        actionType: PHASE_8_MARKET_EVENTS.LISTING_CREATED,
        payload: dto,
      });
      await client.query("UPDATE market.listings SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "RASCUNHO" };
    });
  }

  public approve(ctx: RequestContext, id: string) {
    if (!ctx.roles.some((r) => r === "ADMIN" || r === "REPRESENTANTE_LEGAL")) {
      throw new ForbiddenException({ code: "PERMISSION_DENIED", message: "Admin Dono aprova publicacao." });
    }
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; status: ListingStatus; admin_approved: boolean }>(
        "SELECT id, status, admin_approved FROM market.listings WHERE id = $1",
        [id],
      );
      const listing = row.rows[0];
      if (!listing) throw new NotFoundException({ code: "NOT_FOUND", message: "Anuncio nao encontrado." });
      await client.query("UPDATE market.listings SET admin_approved = true WHERE id = $1", [id]);
      if (!canPublish({ status: listing.status, adminApproved: true })) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "So rascunho aprovado publica." });
      }
      await client.query(
        "UPDATE market.listings SET status = 'PUBLICADO', published_at = now() WHERE id = $1",
        [id],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "RL_LISTING",
        entityId: id,
        actionType: PHASE_8_MARKET_EVENTS.LISTING_PUBLISHED,
        payload: { id },
      });
      await client.query("UPDATE market.listings SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status: "PUBLICADO" };
    });
  }

  public createOrder(ctx: RequestContext, dto: CreateOrderDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; price: string; status: string }>(
        "SELECT id, price::text, status FROM market.listings WHERE id = $1",
        [dto.listingId],
      );
      const listing = row.rows[0];
      if (!listing) throw new NotFoundException({ code: "NOT_FOUND", message: "Anuncio nao encontrado." });
      if (listing.status !== "PUBLICADO") {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "So anuncio publicado vende." });
      }
      const amount = Number(listing.price);
      const commission = commissionOfSale(amount);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO market.orders(
           tenant_id, listing_id, buyer_company_id, buyer_person_id,
           amount, commission_percent, commission_amount, buyer_charge, status
         ) VALUES ($1,$2,$3,$4,$5,3,$6,$7,'PAGO') RETURNING id`,
        [
          ctx.tenantId,
          dto.listingId,
          dto.buyerCompanyId ?? ctx.companyId,
          ctx.personId,
          amount,
          commission,
          buyerCharge(amount),
        ],
      );
      const id = inserted.rows[0]!.id;
      await client.query(
        `UPDATE market.listings SET status = 'VENDIDO' WHERE id = $1`,
        [dto.listingId],
      );
      await client.query(
        `UPDATE stock.items SET status = 'SOLD'
         WHERE id = (SELECT inventory_item_id FROM market.listings WHERE id = $1)`,
        [dto.listingId],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "RL_ORDER",
        entityId: id,
        actionType: PHASE_8_MARKET_EVENTS.ORDER_PAID,
        payload: { amount, commission, buyerCharge: 0 },
      });
      await client.query("UPDATE market.orders SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Pedido RLoja ${id}`,
        entityType: "RL_ORDER",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, amount, commissionAmount: commission, buyerCharge: 0, protocol: proto.number };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
