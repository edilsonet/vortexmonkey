import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import type { RequestContext } from '@vortex/types';

describe('DocumentsService', () => {
  let service: DocumentsService;
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
      presignedPutUrl: vi.fn().mockResolvedValue('http://minio:9000/presigned-put'),
      presignedGetUrl: vi.fn().mockResolvedValue('http://minio:9000/presigned-get'),
      putObject: vi.fn().mockResolvedValue(undefined),
    };

    service = new DocumentsService(mockDb, mockLedger, mockMinio);
  });

  describe('initiateUpload', () => {
    it('throws UnprocessableEntityException if personal data document is PUBLIC', async () => {
      await expect(
        service.initiateUpload(mockContext, {
          name: 'relatorio.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          classification: 'PUBLIC',
          containsPersonalData: true,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('creates document and returns upload presigned url', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result: any = await service.initiateUpload(mockContext, {
        name: 'relatorio.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        classification: 'RESTRICTED',
        containsPersonalData: true,
      });

      expect(result).toHaveProperty('documentId');
      expect(result.uploadUrl).toBe('http://minio:9000/presigned-put');
      expect(mockLedger.append).toHaveBeenCalled();
    });
  });

  describe('addVersion', () => {
    it('adds version and updates master document', async () => {
      // requireDocument mock
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              name: 'manual.pdf',
              hash: 'old-hash',
              contains_personal_data: false,
              classification: 'RESTRICTED',
            },
          ],
        })
        // nextVersionNumber mock
        .mockResolvedValueOnce({ rows: [{ max: '1' }] })
        // insert version mock
        .mockResolvedValueOnce({ rows: [] })
        // update master document mock
        .mockResolvedValueOnce({ rows: [] });

      const result: any = await service.addVersion(mockContext, 'doc-1', {
        hash: 'new-hash-123',
        sizeBytes: 2048,
        changeNote: 'Atualização de seção 2',
      });

      expect(result.version).toBe(2);
      expect(mockLedger.append).toHaveBeenCalled();
    });
  });

  describe('anonymize', () => {
    it('throws if document has no personal data', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'doc-1', name: 'manual.pdf', contains_personal_data: false }],
      });

      await expect(service.anonymize(mockContext, 'doc-1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('anonymizes name and updates personal data flag', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              name: 'contrato-joao.pdf',
              contains_personal_data: true,
              classification: 'PRIVATE',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result: any = await service.anonymize(mockContext, 'doc-1');
      expect(result.anonymized).toBe(true);
      expect(mockLedger.append).toHaveBeenCalled();
    });
  });
});
