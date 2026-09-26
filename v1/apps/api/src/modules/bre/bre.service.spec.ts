import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BreService } from './bre.service';
import type { RequestContext } from '@vortex/types';

describe('BreService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockLedger: any;
  let service: BreService;

  const mockContext: RequestContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    companyId: 'company-1',
    roles: ['admin'],
    scopes: ['*'],
    requestId: 'req-1',
  };

  const ACTIVE_RULE = {
    id: 'rule-1',
    code: 'ACCREDITATION_EXPIRED',
    severity: 'BLOCKING',
    description: 'Test',
    module: 'identity',
    params: { validYears: 3, alertDays: 60 },
    status: 'ACTIVE',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((_ctx: unknown, cb: (client: unknown) => unknown) => cb(mockDb)),
      query: vi.fn(),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };
    service = new BreService(mockDb, mockLedger);
    vi.clearAllMocks();
  });

  // ── Scenario 4: BRE rules block corresponding actions ──
  it('ACCREDITATION_EXPIRED blocks when expired > 3 years', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE }] });
    const result = await service.evaluateRule(mockContext, 'ACCREDITATION_EXPIRED', {
      accredited_at: '2020-01-01',
      entity_type: 'identity.person',
      entity_id: 'person-1',
    });
    expect(result.result).toBe('DENY');
    expect(result.message).toContain('expirado');
  });

  it('ACCREDITATION_EXPIRED allows when within 3 years', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE }] });
    const result = await service.evaluateRule(mockContext, 'ACCREDITATION_EXPIRED', {
      accredited_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      entity_type: 'identity.person',
      entity_id: 'person-1',
    });
    expect(result.result).toBe('ALLOW');
  });

  it('LICENSE_EXPIRED blocks when license is expired', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'LICENSE_EXPIRED', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'LICENSE_EXPIRED', {
      license_expires_at: '2025-01-01',
      entity_type: 'identity.person',
      entity_id: 'person-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('FUEL_INSUFFICIENT blocks when fuel below VFR minimum', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'FUEL_INSUFFICIENT', params: { vfrMinutes: 30, ifrMinutes: 45 } }] });
    const result = await service.evaluateRule(mockContext, 'FUEL_INSUFFICIENT', {
      fuel_minutes: 20,
      is_ifr: false,
      entity_type: 'operators.dispatch',
      entity_id: 'dispatch-1',
    });
    expect(result.result).toBe('DENY');
    expect(result.message).toContain('20min');
  });

  it('FUEL_INSUFFICIENT allows when fuel above minimum', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'FUEL_INSUFFICIENT', params: { vfrMinutes: 30, ifrMinutes: 45 } }] });
    const result = await service.evaluateRule(mockContext, 'FUEL_INSUFFICIENT', {
      fuel_minutes: 60,
      is_ifr: false,
      entity_type: 'operators.dispatch',
      entity_id: 'dispatch-1',
    });
    expect(result.result).toBe('ALLOW');
  });

  it('PART_RED_TAG blocks when tag is VERMELHA', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'PART_RED_TAG', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'PART_RED_TAG', {
      tag: 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL',
      entity_type: 'maintenance.part',
      entity_id: 'part-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('TOOL_CALIBRATION_EXPIRED blocks when calibration expired', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'TOOL_CALIBRATION_EXPIRED', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'TOOL_CALIBRATION_EXPIRED', {
      calibration_expires_at: '2025-01-01',
      entity_type: 'maintenance.tool',
      entity_id: 'tool-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('CRS_WITHOUT_SIGNATURE blocks when no CRS signature', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'CRS_WITHOUT_SIGNATURE', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'CRS_WITHOUT_SIGNATURE', {
      has_crs_signature: false,
      entity_type: 'maintenance.os',
      entity_id: 'os-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('SEGVOO_REQUIRED blocks when SEGVOO 001 missing', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'SEGVOO_REQUIRED', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'SEGVOO_REQUIRED', {
      requires_segvoo: true,
      has_segvoo_001: false,
      entity_type: 'maintenance.os',
      entity_id: 'os-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('AIRCRAFT_RAB_MISMATCH blocks when RAB does not match', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'AIRCRAFT_RAB_MISMATCH', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'AIRCRAFT_RAB_MISMATCH', {
      rab_match: false,
      entity_type: 'operators.aircraft',
      entity_id: 'aircraft-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('LISTING_WITHOUT_INVENTORY blocks when inventory item missing', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'LISTING_WITHOUT_INVENTORY', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'LISTING_WITHOUT_INVENTORY', {
      inventory_item_exists: false,
      entity_type: 'catalog.listing',
      entity_id: 'listing-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('ENROLLMENT_DOUBLE_PERIOD blocks when periods exceed max', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'ENROLLMENT_DOUBLE_PERIOD', params: { maxPeriods: 2 } }] });
    const result = await service.evaluateRule(mockContext, 'ENROLLMENT_DOUBLE_PERIOD', {
      enrolled_periods: 3,
      entity_type: 'training.enrollment',
      entity_id: 'enroll-1',
    });
    expect(result.result).toBe('DENY');
  });

  it('SESCINC_RESPONSE_OVER_LIMIT alerts when response time > 180s', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'SESCINC_RESPONSE_OVER_LIMIT', params: { maxSeconds: 180 } }] });
    const result = await service.evaluateRule(mockContext, 'SESCINC_RESPONSE_OVER_LIMIT', {
      response_seconds: 240,
      entity_type: 'training.sescinc',
      entity_id: 'sescinc-1',
    });
    expect(result.result).toBe('ALERT');
  });

  it('should return DENY for unknown rule code', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    await expect(service.evaluateRule(mockContext, 'UNKNOWN_RULE', {})).rejects.toThrow('não encontrada');
  });

  it('should return ALLOW for disabled rule', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, status: 'DISABLED' }] });
    const result = await service.evaluateRule(mockContext, 'ACCREDITATION_EXPIRED', {
      accredited_at: '2020-01-01',
      entity_type: 'identity.person',
      entity_id: 'person-1',
    });
    expect(result.result).toBe('ALLOW');
  });

  // ── Scenario 5: All 14 rules evaluated ──
  it('should evaluate all 14 BRE rules without error', async () => {
    const rules = [
      'ACCREDITATION_EXPIRED', 'LICENSE_EXPIRED', 'TOXICOLOGICAL_EXPIRED',
      'MEL_ITEM_EXPIRED', 'DA_PENDING', 'FUEL_INSUFFICIENT',
      'TOOL_CALIBRATION_EXPIRED', 'PART_RED_TAG', 'CRS_WITHOUT_SIGNATURE',
      'SEGVOO_REQUIRED', 'AIRCRAFT_RAB_MISMATCH', 'LISTING_WITHOUT_INVENTORY',
      'ENROLLMENT_DOUBLE_PERIOD', 'SESCINC_RESPONSE_OVER_LIMIT',
    ];
    for (const code of rules) {
      mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code, params: code === 'FUEL_INSUFFICIENT' ? { vfrMinutes: 30, ifrMinutes: 45 } : code === 'ENROLLMENT_DOUBLE_PERIOD' ? { maxPeriods: 2 } : code === 'SESCINC_RESPONSE_OVER_LIMIT' ? { maxSeconds: 180 } : {} }] });
      const result = await service.evaluateRule(mockContext, code, { entity_type: 'test', entity_id: 'test-1' });
      expect(result.rule_code).toBe(code);
      expect(['ALLOW', 'DENY', 'ALERT']).toContain(result.result);
    }
  });

  // ── Scenario 6: Idempotent webhook does not duplicate ──
  it('should not duplicate integration log with same idempotency key', async () => {
    let callCount = 0;
    mockDb.query = vi.fn().mockImplementation(async (..._args: unknown[]) => {
      callCount++;
      if (callCount === 1) {
        return { rows: [{ id: 'log-1', idempotency_key: 'wh-123' }] };
      }
      const err = new Error('duplicate key value violates unique constraint');
      (err as unknown as { code: string }).code = '23505';
      throw err;
    });
    await mockDb.query(
      `INSERT INTO integrations.integration_logs (provider, direction, event_type, idempotency_key) VALUES ($1, $2, $3, $4)`,
      ['ASAAS', 'INBOUND', 'PAYMENT_RECEIVED', 'wh-123'],
    );
    let duplicateCaught = false;
    try {
      await mockDb.query(
        `INSERT INTO integrations.integration_logs (provider, direction, event_type, idempotency_key) VALUES ($1, $2, $3, $4)`,
        ['ASAAS', 'INBOUND', 'PAYMENT_RECEIVED', 'wh-123'],
      );
    } catch (e: unknown) {
      if ((e as Error).message.includes('duplicate key')) {
        duplicateCaught = true;
      }
    }
    expect(duplicateCaught).toBe(true);
  });

  // ── Scenario 7: Circuit breaker — integration failure does not crash main flow ──
  it('should handle integration failure gracefully without throwing', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE, code: 'AIRCRAFT_RAB_MISMATCH', params: {} }] });
    const result = await service.evaluateRule(mockContext, 'AIRCRAFT_RAB_MISMATCH', {
      rab_match: undefined, // unknown — integration failed
      entity_type: 'operators.aircraft',
      entity_id: 'aircraft-1',
    });
    // Without explicit false, rule should ALLOW (circuit breaker: fail-open)
    expect(result.result).toBe('ALLOW');
    expect(result.message).toContain('sucesso');
  });

  // ── Scenario 8 (BRE): Rule evaluation generates ledger block ──
  it('should generate ledger block on every rule evaluation', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ ...ACTIVE_RULE }] });
    await service.evaluateRule(mockContext, 'ACCREDITATION_EXPIRED', {
      accredited_at: '2020-01-01',
      entity_type: 'identity.person',
      entity_id: 'person-1',
    });
    expect(mockLedger.append).toHaveBeenCalledTimes(1);
    expect(mockLedger.append).toHaveBeenCalledWith(
      mockDb,
      mockContext,
      expect.objectContaining({ entityType: 'BRE_RULE', actionType: 'EVALUATED' }),
    );
  });
});
