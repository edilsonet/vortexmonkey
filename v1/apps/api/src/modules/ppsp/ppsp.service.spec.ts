import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PpspService } from './ppsp.service';
import type { RequestContext } from '@vortex/types';

describe('PpspService', () => {
  let service: PpspService;
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

    service = new PpspService(mockDb, mockLedger);
  });

  describe('logToxicologicalExam', () => {
    it('calculates 90-day validity for NEGATIVO result without suspending', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'arso-1', tenant_id: 'tenant-456', user_id: 'user-123', status: 'ATIVO' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const examDate = new Date().toISOString().slice(0, 10);
      const result: any = await service.logToxicologicalExam(mockContext, {
        arsoPersonnelId: 'arso-1',
        examDate,
        result: 'NEGATIVO',
        laboratory: 'Lab Central ANAC',
        reportHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });

      expect(result.suspended).toBe(false);
      expect(result.result).toBe('NEGATIVO');
      expect(mockLedger.append).toHaveBeenCalledTimes(1);
    });

    it('triggers IMMEDIATE AND IRREVOCABLE SUSPENSION for POSITIVO result', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'arso-1', tenant_id: 'tenant-456', user_id: 'user-123', status: 'ATIVO' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // insert exam
        .mockResolvedValueOnce({ rows: [] }); // update arso status to SUSPENDED

      const examDate = new Date().toISOString().slice(0, 10);
      const result: any = await service.logToxicologicalExam(mockContext, {
        arsoPersonnelId: 'arso-1',
        examDate,
        result: 'POSITIVO',
        laboratory: 'Lab Central ANAC',
        reportHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });

      expect(result.suspended).toBe(true);
      expect(result.suspensionNote).toContain('AFASTAMENTO IMEDIATO PPSP');
      expect(mockLedger.append).toHaveBeenCalledTimes(2);
    });
  });

  describe('drawRandomTestSample', () => {
    it('selects 25% of active ARSO personnel auditably', async () => {
      // Mock 8 active ARSO personnel -> 25% = 2 selected
      const mockArsoList = Array.from({ length: 8 }, (_, i) => ({
        id: `arso-${i + 1}`,
        tenant_id: 'tenant-456',
        user_id: `user-${i + 1}`,
        arso_function: 'PILOTO_COMANDO',
        status: 'ATIVO',
      }));

      mockDb.query.mockResolvedValueOnce({ rows: mockArsoList });

      const result: any = await service.drawRandomTestSample(mockContext, {});

      expect(result.sampleSize).toBe(2);
      expect(result.totalActive).toBe(8);
      expect(result.selectedPersonnel).toHaveLength(2);
      expect(mockLedger.append).toHaveBeenCalledTimes(1);
    });
  });
});
