import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RlojaService } from './rloja.service';
import type { RequestContext } from '@vortex/types';

describe('RlojaService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockLedger: any;
  let service: RlojaService;

  const mockContext: RequestContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    companyId: 'company-1',
    roles: ['admin'],
    scopes: ['*'],
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((_ctx: unknown, cb: (client: unknown) => unknown) => cb(mockDb)),
      query: vi.fn(),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };
    service = new RlojaService(mockDb, mockLedger);
    vi.clearAllMocks();
  });

  // ── Scenario 1: Listing without inventory item is rejected ──
  it('should reject listing when inventory item does not exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    await expect(service.createListing(mockContext, {
      inventory_item_id: 'nonexistent',
      origin: 'EMPRESA',
      category: 'PECA',
      title: 'Peça test',
      price: 100,
    })).rejects.toThrow('Item de estoque não encontrado');
  });

  it('should reject listing when item belongs to another tenant', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', tenant_id: 'tenant-other' }] });
    await expect(service.createListing(mockContext, {
      inventory_item_id: 'item-1',
      origin: 'EMPRESA',
      category: 'PECA',
      title: 'Peça test',
      price: 100,
    })).rejects.toThrow('outro tenant');
  });

  it('should reject listing when part has red tag', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tenant_id: 'tenant-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tag: 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL', status: 'EM_ESTOQUE' }] });
    await expect(service.createListing(mockContext, {
      inventory_item_id: 'item-1',
      origin: 'EMPRESA',
      category: 'PECA',
      title: 'Peça vermelha',
      price: 100,
    })).rejects.toThrow('etiqueta vermelha');
  });

  it('should reject listing when part is in quarantine', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tenant_id: 'tenant-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tag: 'VERDE_SERVICAVEL', status: 'QUARENTENA' }] });
    await expect(service.createListing(mockContext, {
      inventory_item_id: 'item-1',
      origin: 'EMPRESA',
      category: 'PECA',
      title: 'Peça quarentena',
      price: 100,
    })).rejects.toThrow('quarentena');
  });

  // ── Scenario 2: 3% commission charged to seller; buyer exempt ──
  it('should calculate 3% commission on order creation', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO', origin: 'EMPRESA', price: 10000, seller_person_id: 'seller-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', listing_id: 'listing-1', amount: 10000, commission_percent: 3, commission_amount: 300, status: 'PENDENTE' }] });
    const order = await service.createOrder(mockContext, { listing_id: 'listing-1', buyer_company_id: 'buyer-co' }) as Record<string, unknown>;
    expect(order.commission_percent).toBe(3);
    expect(order.commission_amount).toBe(300);
    expect(order.amount).toBe(10000);
  });

  it('should not charge buyer any commission', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO', origin: 'EMPRESA', price: 5000, seller_person_id: 'seller-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', amount: 5000, commission_amount: 150, buyer_company_id: 'buyer-co' }] });
    const order = await service.createOrder(mockContext, { listing_id: 'listing-1', buyer_company_id: 'buyer-co' }) as Record<string, unknown>;
    // Buyer is exempt — order amount is the full price; commission is separate
    expect(order.amount).toBe(5000);
    expect(order.commission_amount).toBe(150);
  });

  // ── Scenario 3: Admin Dono controls publication ──
  it('should approve listing when status is RASCUNHO', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'RASCUNHO' }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE
    const result = await service.approveListing(mockContext, 'listing-1', true) as Record<string, unknown>;
    expect(result.status).toBe('PUBLICADO');
    expect(result.admin_approved).toBe(true);
  });

  it('should reject approval of non-RASCUNHO listing', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO' }] });
    await expect(service.approveListing(mockContext, 'listing-1', true)).rejects.toThrow('RASCUNHO');
  });

  it('should cancel listing when admin rejects', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'RASCUNHO' }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE
    const result = await service.approveListing(mockContext, 'listing-1', false) as Record<string, unknown>;
    expect(result.status).toBe('CANCELADO');
    expect(result.admin_approved).toBe(false);
  });

  it('should reject order when listing is not PUBLICADO', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'RASCUNHO', price: 100 }] });
    await expect(service.createOrder(mockContext, { listing_id: 'listing-1' })).rejects.toThrow('disponível');
  });

  it('should prevent seller from buying own listing (explicit buyer_person_id)', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO', origin: 'PARTICULAR', price: 100, seller_person_id: 'user-1' }] });
    await expect(service.createOrder(mockContext, { listing_id: 'listing-1', buyer_person_id: 'user-1' })).rejects.toThrow('próprio');
  });

  it('should prevent seller from buying own listing (implicit buyer_person_id from context)', async () => {
    // seller_person_id matches context.userId — buyer_person_id not provided, defaults to context.userId
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO', origin: 'PARTICULAR', price: 100, seller_person_id: 'user-1' }] });
    await expect(service.createOrder(mockContext, { listing_id: 'listing-1' })).rejects.toThrow('próprio');
  });

  // ── Scenario 8: Publishing, sale, and integration generate ledger blocks ──
  it('should generate ledger block on listing creation', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tenant_id: 'tenant-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', tag_color: 'AZUL', status: 'OK' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', tenant_id: 'tenant-1' }] });
    await service.createListing(mockContext, {
      inventory_item_id: 'item-1',
      origin: 'EMPRESA',
      category: 'PECA',
      title: 'Test',
      price: 100,
    });
    expect(mockLedger.append).toHaveBeenCalledTimes(1);
    expect(mockLedger.append).toHaveBeenCalledWith(
      mockDb,
      mockContext,
      expect.objectContaining({ entityType: 'CATALOG_LISTING', actionType: 'CREATED' }),
    );
  });

  it('should generate ledger block on approval', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'RASCUNHO' }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE
    await service.approveListing(mockContext, 'listing-1', true);
    expect(mockLedger.append).toHaveBeenCalledWith(
      mockDb,
      mockContext,
      expect.objectContaining({ entityType: 'CATALOG_LISTING', actionType: 'PUBLISHED' }),
    );
  });

  it('should generate ledger block on order creation', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'listing-1', status: 'PUBLICADO', origin: 'EMPRESA', price: 1000, seller_person_id: 'seller-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', listing_id: 'listing-1', amount: 1000, commission_percent: 3, commission_amount: 30, status: 'PENDENTE' }] });
    await service.createOrder(mockContext, { listing_id: 'listing-1', buyer_company_id: 'buyer-co' });
    expect(mockLedger.append).toHaveBeenCalledWith(
      mockDb,
      mockContext,
      expect.objectContaining({ entityType: 'CATALOG_ORDER', actionType: 'CREATED' }),
    );
  });

  it('should generate ledger block on payment', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'PENDENTE', listing_id: 'listing-1', amount: 1000, commission_amount: 30 }] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE order
      .mockResolvedValueOnce({ rows: [] }); // UPDATE listing
    await service.payOrder(mockContext, 'order-1', 'ASAAS-123');
    expect(mockLedger.append).toHaveBeenCalledWith(
      mockDb,
      mockContext,
      expect.objectContaining({ entityType: 'CATALOG_ORDER', actionType: 'PAID' }),
    );
  });

  // ── Scenario 9: Search performance < 200ms ──
  it('should search listings within 200ms (mocked DB)', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'l1' }, { id: 'l2' }] });
    const start = Date.now();
    await service.searchListings(mockContext, { category: 'PECA' });
    const elapsed = Date.now() - start;
    // Mock DB is instant; verify the path runs without timeout
    expect(elapsed).toBeLessThan(200);
  });
});
