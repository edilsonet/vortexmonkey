import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import type { RequestContext } from '@vortex/types';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockDb: any;
  let mockLedger: any;

  const mockContext: RequestContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['ADMIN'],
    scopes: ['*'],
    companyId: 'company-789',
    requestId: 'req-abc',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((ctx, cb) => cb(mockDb)),
      query: vi.fn(),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };

    service = new SubscriptionsService(mockDb, mockLedger);
  });

  describe('calculateCommission', () => {
    it('calculates 3% commission for MARKETPLACE charged to seller', () => {
      const result = service.calculateCommission({
        context: 'MARKETPLACE',
        totalValueCents: 100000, // R$ 1.000,00
        sellerOrEmployerId: 'seller-1',
      });

      expect(result.commissionCents).toBe(3000); // R$ 30,00 (3%)
      expect(result.chargedToRole).toBe('VENDEDOR');
    });

    it('calculates 3% commission for RECRUITMENT with 90-day replacement guarantee', () => {
      const result = service.calculateCommission({
        context: 'RECRUITMENT',
        totalValueCents: 500000, // R$ 5.000,00 (1º salário)
        sellerOrEmployerId: 'employer-1',
      });

      expect(result.commissionCents).toBe(15000); // R$ 150,00 (3%)
      expect(result.chargedToRole).toBe('CONTRATANTE');
      expect(result.guaranteeNote).toContain('90 dias');
    });
  });

  describe('addUserToTenant', () => {
    it('throws UnprocessableEntityException when user count exceeds plan limit', async () => {
      // Mock active subscription STARTER (max 5 users)
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'sub-1', tenant_id: 'tenant-456', plan: 'STARTER', status: 'ACTIVE' }],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '5' }], // Já possui 5 usuários
        });

      await expect(
        service.addUserToTenant(mockContext, 'tenant-456', {
          userId: 'user-new',
          role: 'USER',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('handleAsaasWebhook', () => {
    it('processes PAYMENT_RECEIVED and updates invoice status to PAID', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // insert invoice
        .mockResolvedValueOnce({ rows: [] }); // update subscription

      const result: any = await service.handleAsaasWebhook(mockContext, {
        event: 'PAYMENT_RECEIVED',
        paymentId: 'pay-123',
        tenantId: 'tenant-456',
        amountCents: 29900,
        billingType: 'PIX',
      });

      expect(result.status).toBe('PAID');
      expect(mockLedger.append).toHaveBeenCalled();
    });
  });
});
