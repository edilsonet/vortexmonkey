import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ComplianceService } from './compliance.service';
import type { RequestContext } from '@vortex/types';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let mockDb: any;
  let mockLedger: any;
  let mockMinio: any;

  const mockContext: RequestContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['OPERATOR'],
    tenantIds: ['tenant-456'],
    companyId: 'company-789',
    traceId: 'trace-abc',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((ctx, cb) => cb(mockDb)),
      query: vi.fn(),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };
    mockMinio = {
      presignedGetUrl: vi.fn().mockResolvedValue('http://minio:9000/presigned-export.json'),
      putObject: vi.fn().mockResolvedValue(undefined),
    };

    service = new ComplianceService(mockDb, mockLedger, mockMinio);
  });

  describe('requestExport', () => {
    it('creates export job, collects data, saves to MinIO and returns presigned download URL', async () => {
      mockDb.query
        // INSERT lgpd_requests
        .mockResolvedValueOnce({ rows: [] })
        // collectUserData: identity
        .mockResolvedValueOnce({ rows: [{ id: 'user-123', name: 'João Silva', email: 'joao@vortex.com' }] })
        // collectUserData: protocols
        .mockResolvedValueOnce({ rows: [] })
        // collectUserData: signatures
        .mockResolvedValueOnce({ rows: [] })
        // collectUserData: lgpdHistory
        .mockResolvedValueOnce({ rows: [] })
        // UPDATE lgpd_requests status COMPLETED
        .mockResolvedValueOnce({ rows: [] });

      const result: any = await service.requestExport(mockContext, {
        justification: 'Portabilidade dos meus dados',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.downloadUrl).toBe('http://minio:9000/presigned-export.json');
      expect(mockMinio.putObject).toHaveBeenCalled();
      expect(mockLedger.append).toHaveBeenCalledTimes(2);
    });
  });

  describe('requestErasure', () => {
    it('anonymizes personal data in DB while preserving ledger integrity', async () => {
      mockDb.query
        // INSERT lgpd_requests
        .mockResolvedValueOnce({ rows: [] })
        // UPDATE identity.users (anonymize)
        .mockResolvedValueOnce({ rows: [] })
        // UPDATE documents.documents (anonymize personal docs)
        .mockResolvedValueOnce({ rows: [] })
        // UPDATE lgpd_requests COMPLETED
        .mockResolvedValueOnce({ rows: [] });

      const result: any = await service.requestErasure(mockContext, {
        justification: 'Direito ao esquecimento LGPD art. 18',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.anonymized).toBe(true);
      expect(result.ledgerPreserved).toBe(true);
      expect(mockLedger.append).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokeConsent', () => {
    it('records consent revocation event and appends to ledger', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result: any = await service.revokeConsent(mockContext, {
        purpose: 'MARKETING',
        legalBasis: 'LGPD art. 8 §5',
      });

      expect(result.type).toBe('CONSENT_REVOKED');
      expect(result.purpose).toBe('MARKETING');
      expect(mockLedger.append).toHaveBeenCalled();
    });
  });
});
