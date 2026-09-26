import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import type { RequestContext } from '@vortex/types';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
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

    service = new MaintenanceService(mockDb, mockLedger);
  });

  describe('addWorkOrderTask (Trava 2 e Trava 3)', () => {
    it('Trava 2: throws UnprocessableEntityException when tool calibration is expired (IS 43.13-005)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'wo-1', tenant_id: 'tenant-456', status: 'ABERTA' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'tool-1', identification: 'Torquímetro 01', status: 'CALIBRACAO_VENCIDA' }],
        });

      await expect(
        service.addWorkOrderTask(mockContext, 'wo-1', {
          taskNumber: '10-01',
          description: 'Aperto de parafusos',
          usedToolId: 'tool-1',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Trava 3: throws UnprocessableEntityException when part tag is RED (IS 43-001)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'wo-1', tenant_id: 'tenant-456', status: 'ABERTA' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'part-1', part_number: 'PN-123', tag: 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL', status: 'DESCARTADO' }],
        });

      await expect(
        service.addWorkOrderTask(mockContext, 'wo-1', {
          taskNumber: '10-02',
          description: 'Troca de bomba de combustível',
          installedPartId: 'part-1',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('closeWorkOrder (Trava 1, Trava 4 e Trava 5)', () => {
    it('Trava 1: throws UnprocessableEntityException if inspector is not qualified RT/Inspector (RBAC 43.7)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'wo-1', tenant_id: 'tenant-456', aircraft_id: 'ac-1', status: 'EM_EXECUCAO' }],
        })
        .mockResolvedValueOnce({ rows: [] }); // inspector NOT found as RT/INSPETOR

      await expect(
        service.closeWorkOrder(mockContext, 'wo-1', {
          inspectorId: 'unqualified-user',
          signatureId: 'sig-1',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Trava 4: throws UnprocessableEntityException when aircraft has pending DA (RBAC 39)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'wo-1', tenant_id: 'tenant-456', aircraft_id: 'ac-1', status: 'EM_EXECUCAO' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'personnel-1', person_id: 'inspector-1', role: 'INSPETOR' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'ad-1', ad_number: 'DA 2026-01-01', status: 'PENDENTE' }],
        });

      await expect(
        service.closeWorkOrder(mockContext, 'wo-1', {
          inspectorId: 'inspector-1',
          signatureId: 'sig-1',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('Trava 5: throws UnprocessableEntityException if major repair lacks SEGVOO 001 (IS 43.9-001)', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 'wo-1', tenant_id: 'tenant-456', aircraft_id: 'ac-1', status: 'EM_EXECUCAO', is_major: true }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'personnel-1', person_id: 'inspector-1', role: 'INSPETOR' }],
        })
        .mockResolvedValueOnce({ rows: [] }); // no pending AD

      await expect(
        service.closeWorkOrder(mockContext, 'wo-1', {
          inspectorId: 'inspector-1',
          signatureId: 'sig-1',
          // segvoo001Id omisso
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
