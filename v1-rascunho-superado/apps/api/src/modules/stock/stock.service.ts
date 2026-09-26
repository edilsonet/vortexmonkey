import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import type { AddItemDto, TransferCustodyDto } from "./stock.dto.ts";

@Injectable()
export class StockService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const holdings = await client.query(
        `SELECT h.*,
                COALESCE(jsonb_agg(jsonb_build_object(
                  'id', i.id, 'sku', i.sku, 'name', i.name, 'quantity', i.quantity,
                  'origin_mark', i.origin_mark, 'status', i.status
                ) ORDER BY i.created_at DESC) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
         FROM stock.holdings h
         LEFT JOIN stock.items i ON i.holding_id = h.id
         WHERE h.tenant_id = $1
         GROUP BY h.id
         ORDER BY h.kind`,
        [ctx.tenantId],
      );
      return holdings.rows;
    });
  }

  public addItem(ctx: RequestContext, dto: AddItemDto) {
    return this.db.withContext(ctx, async (client) => {
      const holding = await client.query("SELECT id FROM stock.holdings WHERE id = $1 AND tenant_id = $2", [dto.holdingId, ctx.tenantId]);
      if (!holding.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Custodia nao encontrada." });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO stock.items(holding_id, sku, name, quantity, origin_mark)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [dto.holdingId, dto.sku, dto.name, dto.quantity ?? 1, dto.originMark],
      );
      const id = inserted.rows[0]!.id;
      await this.ledger.append(client, ctx, { entityType: "STOCK_ITEM", entityId: id, actionType: "INSERT", payload: dto });
      return { id };
    });
  }

  public transfer(ctx: RequestContext, dto: TransferCustodyDto) {
    return this.db.withContext(ctx, async (client) => {
      const item = await client.query("SELECT id, status FROM stock.items WHERE id = $1", [dto.itemId]);
      if (!item.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Item nao encontrado." });
      if (item.rows[0].status === "SOLD") {
        return { transferred: false, reason: "Itens vendidos nao voltam." };
      }
      await client.query("UPDATE stock.items SET holding_id = $2 WHERE id = $1", [dto.itemId, dto.targetHoldingId]);
      await this.ledger.append(client, ctx, { entityType: "STOCK_ITEM", entityId: dto.itemId, actionType: "TRANSFER", payload: dto });
      return { transferred: true };
    });
  }
}
