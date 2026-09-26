import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { COMMISSION_PERCENT, RLOJA_SEARCH_TIMEOUT_MS } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class RlojaService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Valida se a peça tem etiqueta vermelha ou está em quarentena.
   * Retorna true se a peça pode ser anunciada.
   */
  private async isPartAvailableForListing(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }, inventoryItemId: string): Promise<boolean> {
    const result = await client.query(
      `SELECT id, tag_color, status FROM ops.parts_inventory WHERE id = $1`,
      [inventoryItemId],
    );
    if (result.rows.length === 0) return false;
    const part: Record<string, unknown> = result.rows[0] as Record<string, unknown>;
    // Peça com etiqueta vermelha ou em quarentena não pode ser anunciada
    if (part.tag === 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL') return false;
    if (part.status === 'QUARENTENA') return false;
    return true;
  }

  /**
   * Cria anúncio na RLoja.
   * Validações: item de estoque existe, peça disponível, empresa vs particular.
   */
  public createListing(context: RequestContext, dto: {
    inventory_item_id: string;
    origin: string;
    category: string;
    title: string;
    description?: string;
    price: number;
  }): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // 1. Validate inventory item exists (listing = view of inventory)
      const itemCheck = await client.query(
        `SELECT id, tenant_id FROM ops.parts_inventory WHERE id = $1`,
        [dto.inventory_item_id],
      );
      if (itemCheck.rows.length === 0) {
        throw new NotFoundException('Item de estoque não encontrado — anúncio requer item válido');
      }
      const item = itemCheck.rows[0];
      if (item.tenant_id !== context.tenantId) {
        throw new ForbiddenException('Item de estoque pertence a outro tenant');
      }

      // 2. Validate part is not red-tagged or quarantined
      const available = await this.isPartAvailableForListing(client, dto.inventory_item_id);
      if (!available) {
        throw new BadRequestException('Peça com etiqueta vermelha ou em quarentena — não pode ser anunciada');
      }

      // 3. Insert listing
      const listingId = randomUUID();
      const ledgerId = randomUUID();
      const rows = await client.query(
        `INSERT INTO catalog.listings
           (id, tenant_id, inventory_item_id, origin, seller_company_id, seller_person_id, category, title, description, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          listingId,
          context.tenantId,
          dto.inventory_item_id,
          dto.origin,
          context.companyId ?? null,
          context.userId,
          dto.category,
          dto.title,
          dto.description ?? null,
          dto.price,
        ],
      );

      // 4. Ledger block
      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'CATALOG_LISTING', entityId: listingId,
        actionType: 'CREATED',
        payload: { ...dto, tenant_id: context.tenantId },
      });

      return rows.rows[0];
    });
  }

  /**
   * Admin Dono aprova/rejeita publicação.
   */
  public approveListing(context: RequestContext, listingId: string, approved: boolean): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT * FROM catalog.listings WHERE id = $1 AND tenant_id = $2`,
        [listingId, context.tenantId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('Anúncio não encontrado');

      const listing = rows.rows[0];
      if (listing.status !== 'RASCUNHO') {
        throw new BadRequestException('Apenas anúncios em RASCUNHO podem ser aprovados');
      }

      if (approved) {
        await client.query(
          `UPDATE catalog.listings
           SET status = 'PUBLICADO', admin_approved = true, published_by = $1, published_at = NOW()
           WHERE id = $2`,
          [context.userId, listingId],
        );
      } else {
        await client.query(
          `UPDATE catalog.listings SET status = 'CANCELADO' WHERE id = $1`,
          [listingId],
        );
      }

      const ledgerId = randomUUID();
      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'CATALOG_LISTING', entityId: listingId,
        actionType: approved ? 'PUBLISHED' : 'CANCELLED',
        payload: { approved, admin_id: context.userId },
        changes: [{ field_path: 'status', old_value: 'RASCUNHO', new_value: approved ? 'PUBLICADO' : 'CANCELADO' }],
      });

      return { id: listingId, status: approved ? 'PUBLICADO' : 'CANCELADO', admin_approved: approved };
    });
  }

  /**
   * Lista anúncios publicados (busca pública).
   */
  public searchListings(context: RequestContext, filters: { category?: string; origin?: string; q?: string }): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const start = Date.now();
      let sql = `SELECT * FROM catalog.listings WHERE tenant_id = $1 AND status = 'PUBLICADO'`;
      const params: unknown[] = [context.tenantId];
      let idx = 2;

      if (filters.category) {
        sql += ` AND category = $${idx++}`;
        params.push(filters.category);
      }
      if (filters.origin) {
        sql += ` AND origin = $${idx++}`;
        params.push(filters.origin);
      }
      if (filters.q) {
        sql += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
        params.push(`%${filters.q}%`);
        idx++;
      }

      sql += ' ORDER BY created_at DESC LIMIT 50';
      const rows = await client.query(sql, params);
      const elapsed = Date.now() - start;
      if (elapsed > RLOJA_SEARCH_TIMEOUT_MS) {
        console.warn(`RLoja search took ${elapsed}ms (limit ${RLOJA_SEARCH_TIMEOUT_MS}ms)`);
      }
      return rows.rows;
    });
  }

  /**
   * Cria pedido de compra. Comissão de 3% cobrada do vendedor; comprador isento.
   */
  public createOrder(context: RequestContext, dto: {
    listing_id: string;
    buyer_company_id?: string;
    buyer_person_id?: string;
  }): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT * FROM catalog.listings WHERE id = $1 AND tenant_id = $2`,
        [dto.listing_id, context.tenantId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('Anúncio não encontrado');

      const listing = rows.rows[0];
      if (listing.status !== 'PUBLICADO') {
        throw new BadRequestException('Anúncio não está disponível para compra');
      }
      const effectiveBuyerId = dto.buyer_person_id ?? context.userId;
      if (listing.origin === 'PARTICULAR' && effectiveBuyerId === listing.seller_person_id) {
        throw new BadRequestException('Vendedor não pode comprar seu próprio anúncio');
      }

      const amount = Number(listing.price);
      const commissionAmount = Math.round(amount * (COMMISSION_PERCENT / 100) * 100) / 100;

      const orderId = randomUUID();
      const ledgerId = randomUUID();
      const orderRows = await client.query(
        `INSERT INTO catalog.orders
           (id, tenant_id, listing_id, buyer_company_id, buyer_person_id, amount, commission_percent, commission_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          orderId,
          context.tenantId,
          dto.listing_id,
          dto.buyer_company_id ?? null,
          effectiveBuyerId,
          amount,
          COMMISSION_PERCENT,
          commissionAmount,
        ],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'CATALOG_ORDER', entityId: orderId,
        actionType: 'CREATED',
        payload: { listing_id: dto.listing_id, amount, commission_amount: commissionAmount, buyer_id: context.userId },
      });

      return orderRows.rows[0];
    });
  }

  /**
   * Registra pagamento do pedido (webhook Asaas).
   */
  public payOrder(context: RequestContext, orderId: string, paymentReference: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = await client.query(
        `SELECT * FROM catalog.orders WHERE id = $1 AND tenant_id = $2`,
        [orderId, context.tenantId],
      );
      if (rows.rows.length === 0) throw new NotFoundException('Pedido não encontrado');

      const order = rows.rows[0];
      if (order.status !== 'PENDENTE') {
        throw new BadRequestException('Pedido já processado');
      }

      await client.query(
        `UPDATE catalog.orders SET status = 'PAGO', payment_reference = $1 WHERE id = $2`,
        [paymentReference, orderId],
      );

      // Mark listing as sold
      await client.query(
        `UPDATE catalog.listings SET status = 'VENDIDO' WHERE id = $1`,
        [order.listing_id],
      );

      const ledgerId = randomUUID();
      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'CATALOG_ORDER', entityId: orderId,
        actionType: 'PAID',
        payload: { payment_reference: paymentReference, amount: order.amount, commission: order.commission_amount },
        changes: [{ field_path: 'status', old_value: 'PENDENTE', new_value: 'PAGO' }],
      });

      return { id: orderId, status: 'PAGO', payment_reference: paymentReference };
    });
  }
}
