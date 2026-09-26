import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { AerodromesService } from './aerodromes.service';
import type { RequestContext } from '@vortex/types';

describe('AerodromesService', () => {
  let service: AerodromesService;
  let mockDb: any;
  let mockLedger: any;

  const mockContext: RequestContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['OPERATOR'],
    scopes: ['*'],
    companyId: 'company-789',
    requestId: 'req-abc',
  };

  const aerodromeRow = {
    id: 'aero-1',
    tenant_id: 'tenant-456',
    company_id: 'company-789',
    icao_code: 'SBGR',
    name: 'Aeroporto Internacional de Guarulhos',
    fire_category: 'CAT_10',
    fire_category_validity: null,
    status: 'OPERACIONAL',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((_ctx, cb) => cb(mockDb)),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };

    service = new AerodromesService(mockDb, mockLedger);
  });

  describe('7. SESCINC: tempo-resposta > 3 minutos registra desvio e alerta', () => {
    it('pure: 180s is within the limit and 181s is not', () => {
      expect(AerodromesService.isFireResponseWithinLimit(180)).toBe(true);
      expect(AerodromesService.isFireResponseWithinLimit(181)).toBe(false);
    });

    it('createFireResponseLog flags within_limit=false and anchors FIRE_RESPONSE_DEVIATION for a 200s response', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });

      await service.createFireResponseLog(mockContext, {
        aerodromeId: 'aero-1',
        incidentType: 'INCENDIO_EM_APROXIMACAO',
        alarmTime: '2026-09-01T10:00:00Z',
        agentApplicationTime: '2026-09-01T10:03:20Z', // 200s depois
        fireVehicles: ['AB-01'],
        extinguishingAgents: ['LGE'],
      });

      const insertArgs = mockDb.query.mock.calls.find((call: Array<unknown>) => String(call[0]).includes('INSERT INTO ops.fire_response_logs'))?.[1] as Array<unknown> | undefined;
      expect(insertArgs?.[6]).toBe(false); // within_limit

      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'FIRE_RESPONSE_LOG', actionType: 'FIRE_RESPONSE_DEVIATION', payload: expect.objectContaining({ withinLimit: false }) }),
      );
    });
  });

  describe('8. RWYCC: cálculo por terço (T1/T2/T3) e emissão de RCR', () => {
    it('pure: RCAM maps contaminants to RWYCC 0-6 and RCR message is standardized', () => {
      expect(AerodromesService.rwyccForContaminant('SECO')).toBe(6);
      expect(AerodromesService.rwyccForContaminant('GELO')).toBe(0);
      expect(AerodromesService.buildRcrMessage('10/28', 5, 4, 3)).toBe('RCR 10/28 T1/5 T2/4 T3/3 RWYCC 3');
    });

    it('createRunwayConditionReport persists the RCR message and sends to TWR', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });

      await service.createRunwayConditionReport(mockContext, {
        aerodromeId: 'aero-1',
        runwayDesignator: '10/28',
        reportTime: '2026-09-01T10:00:00Z',
        rwyccT1: 5,
        rwyccT2: 4,
        rwyccT3: 3,
        contaminants: ['MOLHADO'],
        sendToTwr: true,
      });

      const insertArgs = mockDb.query.mock.calls.find((call: Array<unknown>) => String(call[0]).includes('INSERT INTO ops.runway_condition_reports'))?.[1] as Array<unknown> | undefined;
      expect(insertArgs?.[8]).toBe('RCR 10/28 T1/5 T2/4 T3/3 RWYCC 3');
      expect(insertArgs?.[9]).toBe(true); // sent_to_twr

      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'RUNWAY_CONDITION_REPORT', actionType: 'RCR_SENT_TO_TWR' }),
      );
    });
  });

  describe('9. Fauna: risco R = log(x) e envio ao SIGRA', () => {
    it('pure: risk grade is the base-10 logarithm of the sightings', () => {
      expect(AerodromesService.computeFaunaRisk(100)).toBe(2);
      expect(AerodromesService.computeFaunaRisk(10)).toBe(1);
      expect(AerodromesService.computeFaunaRisk(1000)).toBe(3);
    });

    it('createFaunaEvent computes risk and anchors FAUNA_SENT_TO_SIGRA', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });

      await service.createFaunaEvent(mockContext, {
        aerodromeId: 'aero-1',
        eventType: 'COLISAO',
        species: 'Caracará',
        date: '2026-09-01T10:00:00Z',
        sightings: 100,
        sendToSigra: true,
      });

      const insertArgs = mockDb.query.mock.calls.find((call: Array<unknown>) => String(call[0]).includes('INSERT INTO ops.fauna_events'))?.[1] as Array<unknown> | undefined;
      expect(insertArgs?.[6]).toBe(2); // risk_grade = log10(100)

      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'FAUNA_EVENT', actionType: 'FAUNA_SENT_TO_SIGRA' }),
      );
    });
  });

  describe('10. SGSO: relatório quadrimestral 20/01, 20/05 e 20/09', () => {
    it('pure: report due dates are 20/01, 20/05 and 20/09', () => {
      expect(AerodromesService.isSgsoReportDue(new Date(2026, 0, 20))).toBe(true);
      expect(AerodromesService.isSgsoReportDue(new Date(2026, 4, 20))).toBe(true);
      expect(AerodromesService.isSgsoReportDue(new Date(2026, 8, 20))).toBe(true);
      expect(AerodromesService.isSgsoReportDue(new Date(2026, 2, 20))).toBe(false);
    });

    it('pure: next due report after a given date is computed', () => {
      const next = AerodromesService.nextSgsoReportDue(new Date(2026, 1, 1)); // 01/02/2026
      expect(next.getFullYear()).toBe(2026);
      expect(next.getMonth()).toBe(4); // maio
      expect(next.getDate()).toBe(20);
    });
  });

  describe('2. Pavimento: IRI ≤ 2,5 m/km e macrotextura ≥ 0,60 mm', () => {
    it('registerRunwayPavement blocks IRI above the limit', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });

      await expect(
        service.registerRunwayPavement(mockContext, {
          aerodromeId: 'aero-1',
          runwayDesignator: '10/28',
          iriMKm: 3.1,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('registerRunwayPavement blocks macrotexture below the minimum', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });

      await expect(
        service.registerRunwayPavement(mockContext, {
          aerodromeId: 'aero-1',
          runwayDesignator: '10/28',
          macrotextureMm: 0.4,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('11. Ancoragem: RCR, resposta de incêndio e evento de fauna geram blocos no ledger', () => {
    it('appends ledger blocks for the three operational records', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });
      await service.createRunwayConditionReport(mockContext, {
        aerodromeId: 'aero-1',
        runwayDesignator: '10/28',
        reportTime: '2026-09-01T10:00:00Z',
        rwyccT1: 5,
        rwyccT2: 5,
        rwyccT3: 4,
        sendToTwr: true,
      });

      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });
      await service.createFireResponseLog(mockContext, {
        aerodromeId: 'aero-1',
        incidentType: 'ACIDENTE',
        alarmTime: '2026-09-01T11:00:00Z',
        agentApplicationTime: '2026-09-01T11:02:00Z', // 120s dentro do limite
      });

      mockDb.query.mockResolvedValueOnce({ rows: [aerodromeRow] });
      await service.createFaunaEvent(mockContext, {
        aerodromeId: 'aero-1',
        eventType: 'AVISTAMENTO',
        date: '2026-09-01T12:00:00Z',
        sightings: 50,
      });

      const actions = mockLedger.append.mock.calls.map((call: Array<unknown>) => (call[2] as { actionType: string }).actionType);
      expect(actions).toContain('RCR_SENT_TO_TWR');
      expect(actions).toContain('FIRE_RESPONSE_RECORDED');
      expect(actions).toContain('FAUNA_SENT_TO_SIGRA');
    });
  });

  describe('12. Performance: cálculo de RWYCC em < 50ms', () => {
    it('runs RWYCC/RCR evaluation well under 50ms', () => {
      const startedAt = performance.now();
      for (let index = 0; index < 10_000; index += 1) {
        AerodromesService.buildRcrMessage('10/28', index % 7, (index + 1) % 7, (index + 2) % 7);
        AerodromesService.rwyccForContaminant(['SECO', 'MOLHADO', 'GELO', 'NEVE_COMPACTA'][index % 4]!);
        AerodromesService.computeFaunaRisk(1 + (index % 1000));
        AerodromesService.validatePavement(index % 5, index % 2 === 0 ? 0.8 : 0.4);
        AerodromesService.isFireResponseWithinLimit(120 + (index % 120));
      }
      const elapsedMs = performance.now() - startedAt;
      expect(elapsedMs).toBeLessThan(50);
    });
  });
});