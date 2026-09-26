import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlertsService } from './alerts.service';
import type { RequestContext } from '@vortex/types';

describe('AlertsService', () => {
  let service: AlertsService;
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

    service = new AlertsService(mockDb, mockLedger);
  });

  describe('createAlert', () => {
    it('creates alert with notificationKey idempotency check', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // select existing (none)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'alert-1',
              tenant_id: 'tenant-456',
              alert_type: 'CREDENTIAL_EXPIRING_RBAC183',
              severity: 'CRITICAL',
              status: 'ABERTO',
            },
          ],
        });

      const result: any = await service.createAlert(mockContext, {
        alertType: 'CREDENTIAL_EXPIRING_RBAC183',
        severity: 'CRITICAL',
        title: 'Credenciamento RBAC 183 vencendo em 60 dias',
        notificationKey: 'key-123',
      });

      expect(result.id).toBe('alert-1');
      expect(mockLedger.append).toHaveBeenCalledTimes(1);
    });

    it('returns existing alert when notificationKey already exists (idempotency)', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'alert-existing', status: 'ABERTO', notification_key: 'key-123' }],
      });

      const result: any = await service.createAlert(mockContext, {
        alertType: 'CREDENTIAL_EXPIRING_RBAC183',
        severity: 'CRITICAL',
        title: 'Credenciamento RBAC 183 vencendo em 60 dias',
        notificationKey: 'key-123',
      });

      expect(result.id).toBe('alert-existing');
      expect(mockLedger.append).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('calculates Shell badge counts and sets hasBlockingAlerts flag', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { severity: 'CRITICAL', count: '2' },
          { severity: 'BLOCKING', count: '1' },
          { severity: 'WARNING', count: '5' },
        ],
      });

      const result: any = await service.getSummary(mockContext);

      expect(result.badges.CRITICAL).toBe(2);
      expect(result.badges.BLOCKING).toBe(1);
      expect(result.badges.totalOpen).toBe(8);
      expect(result.hasBlockingAlerts).toBe(true);
    });
  });

  describe('resolveAlert', () => {
    it('updates status to RESOLVED and records ledger event', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'alert-1', tenant_id: 'tenant-456', alert_type: 'LICENSE_CMA_EXPIRING', status: 'ABERTO' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result: any = await service.resolveAlert(mockContext, 'alert-1', {
        resolutionNote: 'Renovado exame médico na ANAC',
      });

      expect(result.status).toBe('RESOLVED');
      expect(mockLedger.append).toHaveBeenCalledTimes(1);
    });
  });
});
