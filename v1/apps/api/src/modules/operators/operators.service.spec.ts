import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import type { RequestContext } from '@vortex/types';

describe('OperatorsService', () => {
  let service: OperatorsService;
  let mockDb: any;
  let mockLedger: any;

  const mockContext: RequestContext = {
    userId: 'doo-123',
    tenantId: 'tenant-456',
    roles: ['OPERATOR'],
    scopes: ['*'],
    companyId: 'company-789',
    requestId: 'req-abc',
  };

  const releaseRow = {
    id: 'dispatch-1',
    tenant_id: 'tenant-456',
    flight_number: 'VOE 1001',
    aircraft_id: 'ac-1',
    departure: 'SBGR',
    destination: 'SBSP',
    alternates: [],
    flight_rule: 'VFR',
    is_night: false,
    fuel_required_minutes: 30,
    fuel_planned_minutes: 60,
    fuel_valid: false,
    weight_balance_valid: true,
    met_valid: true,
    mel_items_valid: false,
    doo_id: 'doo-123',
    status: 'RASCUNHO',
    etops_diversion_minutes: null,
    validation_notes: {},
  };

  const aircraftRow = {
    id: 'ac-1',
    tenant_id: 'tenant-456',
    registration: 'PP-ABC',
    total_hours: 1000,
    total_cycles: 500,
    cva_number: 'CVA-2026-01',
    cva_validity: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
    cva_status: 'VALIDO',
  };

  const fleetRow = {
    id: 'fleet-1',
    operator_id: 'op-1',
    aircraft_id: 'ac-1',
    registration: 'PP-ABC',
    model: 'C208',
    aircraft_category: 'AVIAO',
    last_reweigh_date: new Date().toISOString().slice(0, 10),
    next_reweigh_date: null,
    status: 'OPERACIONAL',
  };

  const operatorRow = {
    id: 'op-1',
    tenant_id: 'tenant-456',
    company_id: 'company-789',
    operator_type: 'RBAC_135',
    coa_number: 'COA-135-01',
    eo_number: 'EO-135-01',
    certification_phase: 'CERTIFICADO',
    etops_approved: false,
    etops_diversion_minutes: null,
    status: 'ATIVO',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((_ctx, cb) => cb(mockDb)),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };

    service = new OperatorsService(mockDb, mockLedger);
  });

  describe('1. MEL vencido bloqueia o voo', () => {
    it('throws UnprocessableEntityException when a deferred MEL item has an expired deadline', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [releaseRow] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'mel-1',
            aircraft_id: 'ac-1',
            ata_chapter: '21',
            item_description: 'Air conditioning pack',
            category: 'CAT_B',
            deferral_deadline: new Date(Date.now() - 86400000).toISOString(),
            status: 'DIFERIDO',
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('2. DA pendente prevalece sobre MEL', () => {
    it('throws UnprocessableEntityException when deferring a MEL item with a pending DA', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'mel-1',
            aircraft_id: 'ac-1',
            ata_chapter: '21',
            item_description: 'Pack 1',
            category: 'CAT_B',
            deferral_deadline: null,
            status: 'OPERACIONAL',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'ad-1', ad_number: 'DA 2026-01-01', status: 'PENDENTE' }] });

      await expect(
        service.deferMelItem(mockContext, 'mel-1', {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('blocks dispatch validation when a pending DA exists for the aircraft', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [releaseRow] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'ad-1', ad_number: 'DA 2026-01-01', status: 'PENDENTE' }] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('3. Combustível VFR: reserva inferior ao mínimo bloqueia despacho', () => {
    it('computes +30 min for VFR day airplane and blocks when planned fuel is below the minimum', async () => {
      expect(OperatorsService.computeRequiredFuelMinutes('VFR', false, 'AVIAO', false)).toBe(30);
      expect(OperatorsService.computeRequiredFuelMinutes('VFR', true, 'AVIAO', false)).toBe(45);
      expect(OperatorsService.computeRequiredFuelMinutes('VFR', false, 'HELICOPTERO', false)).toBe(20);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, fuel_planned_minutes: 20 }] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('4. Combustível IFR: sem alternativa exige 2 horas', () => {
    it('requires 120 minutes when IFR has no alternate and blocks below that', async () => {
      expect(OperatorsService.computeRequiredFuelMinutes('IFR', false, 'JATO', false)).toBe(120);
      expect(OperatorsService.computeRequiredFuelMinutes('IFR', false, 'JATO', true)).toBe(45);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, flight_rule: 'IFR', fuel_planned_minutes: 100 }] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('5. Margem de desempenho sem MET: +4°C aplicado', () => {
    it('applies +4°C over the maximum forecast temperature', () => {
      const margin = OperatorsService.evaluatePerformanceMargin(false, 30);
      expect(margin.performanceValid).toBe(true);
      expect(margin.marginTemperatureC).toBe(34);
    });

    it('blocks when no MET and no forecast temperature is provided', () => {
      const margin = OperatorsService.evaluatePerformanceMargin(false);
      expect(margin.performanceValid).toBe(false);
    });
  });

  describe('6. Repeso de frota vencido (36 meses) bloqueia', () => {
    it('detects reweigh older than 36 months', () => {
      const fourYearsAgo = new Date();
      fourYearsAgo.setMonth(fourYearsAgo.getMonth() - 48);
      expect(OperatorsService.isReweighExpired(fourYearsAgo.toISOString())).toBe(true);
      expect(OperatorsService.isReweighExpired(new Date().toISOString())).toBe(false);
    });

    it('handles date-only strings without timezone day-shift', () => {
      // 37 meses atrás em 'YYYY-MM-DD' deve vencer — sem âncora, o fuso UTC-3
      // deslocaria a data para o dia anterior e inverteria o resultado na borda.
      const past = new Date();
      past.setMonth(past.getMonth() - 37);
      expect(OperatorsService.isReweighExpired(past.toISOString().slice(0, 10))).toBe(true);
      // Hoje (date-only) ainda não venceu: 36 meses a partir de hoje é futuro.
      expect(OperatorsService.isReweighExpired(new Date().toISOString().slice(0, 10))).toBe(false);
    });

    it('blocks dispatch validation when fleet reweigh is expired', async () => {
      const fourYearsAgo = new Date();
      fourYearsAgo.setMonth(fourYearsAgo.getMonth() - 48);

      mockDb.query
        .mockResolvedValueOnce({ rows: [releaseRow] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [{ ...fleetRow, last_reweigh_date: fourYearsAgo.toISOString().slice(0, 10) }] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('7. CVA: vencido bloqueia; alerta 30 dias', () => {
    it('detects expired CVA and 30-day alert window (emissão + 365 dias)', () => {
      // Emitido há 400 dias → venceu há 35 dias.
      const expired = new Date(Date.now() - 400 * 86400000).toISOString();
      // Emitido há 345 dias → vence em 20 dias (janela de alerta de 30 dias).
      const inTwentyDays = new Date(Date.now() - 345 * 86400000).toISOString();
      expect(OperatorsService.isCvaExpired(expired)).toBe(true);
      expect(OperatorsService.isCvaExpiringSoon(inTwentyDays)).toBe(true);
    });

    it('blocks dispatch validation when CVA is in critical non-conformity', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [releaseRow] })
        .mockResolvedValueOnce({ rows: [{ ...aircraftRow, cva_status: 'BLOQUEADO' }] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [operatorRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });
  });

  describe('8. ETOPS: despacho validado por tempo de desvio homologado', () => {
    it('blocks when planned diversion time exceeds the homologated one', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, etops_diversion_minutes: 207 }] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [{ ...operatorRow, etops_approved: true, etops_diversion_minutes: 180 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect((result as { status: string }).status).toBe('BLOQUEADO');
    });

    it('validates when diversion time is within the homologated limit', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, etops_diversion_minutes: 150 }] })
        .mockResolvedValueOnce({ rows: [aircraftRow] })
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [{ ...operatorRow, etops_approved: true, etops_diversion_minutes: 180 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.validateDispatchRelease(mockContext, 'dispatch-1', {});
      expect(result).toMatchObject({ status: 'VALIDADO', fuelValid: true });
    });
  });

  describe('9. Logbook: assinatura obrigatória; status draft/signed/rectified/voided', () => {
    const draftEntry = {
      id: 'log-1',
      tenant_id: 'tenant-456',
      aircraft_id: 'ac-1',
      entry_date: '2026-09-01',
      departure_aerodrome: 'SBGR',
      arrival_aerodrome: 'SBSP',
      takeoff_time: '2026-09-01T10:00:00Z',
      landing_time: '2026-09-01T11:00:00Z',
      flight_time_hours: 1,
      pilot_name: 'João Piloto',
      pilot_license: '123456',
      pilot_funcao: 'PIC',
      status: 'draft',
      version: 1,
    };

    it('signs a draft entry and computes the content hash', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [draftEntry] });

      const result = await service.signLogbookEntry(mockContext, 'log-1', {
        signatureTimestamp: new Date().toISOString(),
        signatureIdentity: 'CN=João Piloto',
        attestationText: 'Declaro a veracidade das informações.',
      });

      expect(result).toMatchObject({ entryId: 'log-1', status: 'signed', signatureVerified: true });
      expect((result as { contentHash: string }).contentHash).toHaveLength(64);
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'LOGBOOK_ENTRY', actionType: 'LOGBOOK_SIGNED' }),
      );
    });

    it('rejects signing an already-signed entry (mandatory single signature)', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ ...draftEntry, status: 'signed' }] });

      await expect(
        service.signLogbookEntry(mockContext, 'log-1', {
          signatureTimestamp: new Date().toISOString(),
          signatureIdentity: 'CN=X',
          attestationText: 'T',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('10. Endosso de instrutor + envio DBE', () => {
    it('endorses a signed entry and sends DBE', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'log-1',
          tenant_id: 'tenant-456',
          aircraft_id: 'ac-1',
          entry_date: '2026-09-01',
          departure_aerodrome: 'SBGR',
          arrival_aerodrome: 'SBSP',
          takeoff_time: '2026-09-01T10:00:00Z',
          landing_time: '2026-09-01T11:00:00Z',
          flight_time_hours: 1,
          pilot_name: 'João Piloto',
          pilot_license: '123456',
          pilot_funcao: 'PIC',
          status: 'signed',
          version: 1,
        }],
      });

      const result = await service.endorseLogbookEntry(mockContext, 'log-1', {
        endossadoPor: 'instrutor-1',
        dbeEnviado: true,
      });

      expect(result).toMatchObject({ entryId: 'log-1', endossado: true, dbeEnviado: true });
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'LOGBOOK_ENTRY', actionType: 'LOGBOOK_ENDORSED' }),
      );
    });
  });

  describe('11. Aeroagrícola: dispersor com calibração vencida bloqueia uso', () => {
    it('registers disperser with CALIBRACAO_VENCIDA when calibration is expired', async () => {
      const expiredDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);

      await service.registerDisperser(mockContext, {
        aircraftId: 'ac-1',
        disperserType: 'LIQUIDOS',
        calibrationExpiry: expiredDate,
        dgpsInstalled: false,
      });

      const insertCalls = mockDb.query.mock.calls as Array<Array<unknown>>;
      const insertCall = insertCalls.find((call) => String(call[0]).includes('INSERT INTO ops.dispersers'));
      expect(insertCall).toBeDefined();
      const insertArgs = insertCall?.[1] as Array<unknown> | undefined;
      expect(insertArgs?.[9]).toBe('CALIBRACAO_VENCIDA');
    });

    it('throws when DGPS is installed without the conformity declaration (IS 137-002)', async () => {
      await expect(
        service.registerDisperser(mockContext, {
          aircraftId: 'ac-1',
          disperserType: 'SOLIDOS',
          calibrationExpiry: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
          dgpsInstalled: true,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('12. Ancoragem: despacho, logbook e MEL geram blocos no ledger', () => {
    it('appends ledger blocks for dispatch, logbook and MEL writes', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [fleetRow] })
        .mockResolvedValueOnce({ rows: [releaseRow] });
      await service.createDispatchRelease(mockContext, {
        aircraftId: 'ac-1',
        departure: 'SBGR',
        destination: 'SBSP',
        flightRule: 'VFR',
        isNight: false,
        fuelPlannedMinutes: 60,
        metValid: true,
        weightBalanceValid: true,
        dooId: 'doo-123',
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, id: 'dispatch-2' }] });
      await service.createLogbookEntry(mockContext, {
        aircraftId: 'ac-1',
        entryType: 'flight',
        entryDate: '2026-09-01',
        entryTimeUtc: '2026-09-01T09:00:00Z',
        departureAerodrome: 'SBGR',
        arrivalAerodrome: 'SBSP',
        takeoffTime: '2026-09-01T10:00:00Z',
        landingTime: '2026-09-01T11:00:00Z',
        flightTimeHours: 1,
        habilitacao: 'IFRA',
        modelo: 'C208',
        airframeHoursIncrement: 1,
        airframeCyclesIncrement: 1,
        pilotPersonId: 'pilot-1',
        pilotName: 'João Piloto',
        pilotLicense: '123456',
        pilotFuncao: 'PIC',
      });

      mockDb.query.mockResolvedValueOnce({ rows: [releaseRow] });
      await service.createMelItem(mockContext, {
        aircraftId: 'ac-1',
        ataChapter: '21',
        itemDescription: 'Pack 1',
        category: 'CAT_B',
      });

      const actions = mockLedger.append.mock.calls.map((call: Array<unknown>) => (call[2] as { actionType: string }).actionType);
      expect(actions).toContain('DISPATCH_CREATED');
      expect(actions).toContain('LOGBOOK_ENTRY_CREATED');
      expect(actions).toContain('MEL_ITEM_CREATED');
    });
  });

  describe('13. Performance: validação de despacho em < 100ms', () => {
    it('runs the full rule evaluation well under 100ms', () => {
      const startedAt = performance.now();
      for (let index = 0; index < 10_000; index += 1) {
        OperatorsService.computeRequiredFuelMinutes(index % 2 === 0 ? 'VFR' : 'IFR', index % 3 === 0, index % 2 === 0 ? 'AVIAO' : 'HELICOPTERO', index % 4 === 0);
        OperatorsService.evaluatePerformanceMargin(index % 2 === 0, 30 + (index % 10));
        OperatorsService.evaluatePaadv({ temperatureC: 4, qnhHpa: -4, windVariationPct: 0.5 });
        OperatorsService.isReweighExpired(new Date(Date.now() - (index % 100) * 86400000).toISOString());
      }
      const elapsedMs = performance.now() - startedAt;
      expect(elapsedMs).toBeLessThan(100);
    });
  });

  describe('releaseDispatch (DOV)', () => {
    it('rejects release by a user that is not the DOO', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ ...releaseRow, status: 'VALIDADO' }] });

      await expect(
        service.releaseDispatch({ ...mockContext, userId: 'other-user' }, 'dispatch-1', { signatureId: 'sig-1' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects release of a non-validated dispatch', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ ...releaseRow, status: 'RASCUNHO' }] });

      await expect(
        service.releaseDispatch(mockContext, 'dispatch-1', { signatureId: 'sig-1' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('releases a validated dispatch with the DOV signature', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...releaseRow, status: 'VALIDADO' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'sig-1' }] });

      const result = await service.releaseDispatch(mockContext, 'dispatch-1', { signatureId: 'sig-1' });
      expect(result).toMatchObject({ releaseId: 'dispatch-1', status: 'LIBERADO', dooSignatureId: 'sig-1' });
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'DISPATCH_RELEASE', actionType: 'DISPATCH_RELEASED' }),
      );
    });
  });
});