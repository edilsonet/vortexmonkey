import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { TrainingService } from './training.service';
import type { RequestContext } from '@vortex/types';

describe('TrainingService', () => {
  let service: TrainingService;
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

  const studentRow = {
    id: 'stu-1',
    tenant_id: 'tenant-456',
    center_id: 'center-1',
    person_id: 'person-1',
    enrollment_code: 'S141-2026-0001',
    course_type: 'PP',
    status: 'MATRICULADO',
    enrollment_date: new Date().toISOString().slice(0, 10),
    course_duration_months: 12,
    max_duration_months: 24,
    theory_evaluation_date: new Date().toISOString().slice(0, 10),
    theory_valid_until: new Date(Date.now() + 300 * 86400000).toISOString(),
  };

  const centerRow = {
    id: 'center-1',
    tenant_id: 'tenant-456',
    company_id: 'company-789',
    center_type: 'CIAC',
    ciac_type: 'TIPO_1_PILOTOS',
    ei_number: 'EI-141-01',
    et_number: null,
    status: 'ATIVO',
    s141_status: 'ATIVO',
  };

  beforeEach(() => {
    mockDb = {
      withContext: vi.fn((_ctx, cb) => cb(mockDb)),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };
    mockLedger = {
      append: vi.fn().mockResolvedValue('ledger-block-1'),
    };

    service = new TrainingService(mockDb, mockLedger);
  });

  describe('1. Trava de matrícula: dobro do período letivo cancela (S141)', () => {
    it('pure: detects enrollment exceeding the double of the homologated period', () => {
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
      expect(TrainingService.isDoublePeriodExceeded(fourYearsAgo.toISOString(), 24)).toBe(true);
      expect(TrainingService.isDoublePeriodExceeded(new Date().toISOString(), 24)).toBe(false);
    });

    it('listStudents auto-cancels students past the double period and anchors the S141 situation', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'stu-1' }, { id: 'stu-2' }] }) // UPDATE ... RETURNING id
        .mockResolvedValueOnce({ rows: [studentRow] }); // SELECT

      await service.listStudents(mockContext);

      expect(mockLedger.append).toHaveBeenCalledTimes(2);
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          entityType: 'STUDENT',
          actionType: 'S141_SITUATION_UPDATED',
          payload: expect.objectContaining({ situation: 'CANCELADO', reason: 'dobro do período letivo homologado (S141)' }),
        }),
      );
    });
  });

  describe('2. Ground school: avaliação teórica expirada (12 meses) invalida aproveitamento', () => {
    it('pure: theory validity is 12 months and expired theory is detected', () => {
      const evaluation = new Date('2026-01-10');
      const validUntil = TrainingService.computeTheoryValidUntil(evaluation);
      expect(validUntil.getFullYear()).toBe(2027);
      expect(validUntil.getMonth()).toBe(0);
      expect(TrainingService.isTheoryExpired(new Date(Date.now() - 86400000).toISOString())).toBe(true);
      expect(TrainingService.isTheoryExpired(validUntil.toISOString())).toBe(false);
    });

    it('graduateStudent blocks when ground school theory evaluation is expired', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ ...studentRow, theory_valid_until: new Date(Date.now() - 30 * 86400000).toISOString() }],
      });

      await expect(
        service.graduateStudent(mockContext, 'stu-1', { completionDate: '2026-09-01' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('3. Certificado de conclusão em até 10 dias corridos', () => {
    it('pure: certificate due date is exactly +10 calendar days (date-only input, sem deslocamento de fuso)', () => {
      const due = TrainingService.computeCertificateDueDate('2026-09-01');
      expect(due.getDate()).toBe(11);
      expect(due.getMonth()).toBe(8); // setembro
    });

    it('graduateStudent approves and issues the certificate with the due date', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [studentRow] }) // aluno MATRICULADO com teoria válida
        .mockResolvedValueOnce({ // examinador ativo com recertificação válida
          rows: [{
            id: 'inst-1',
            center_id: 'center-1',
            instructor_type: 'EXAMINADOR',
            status: 'ATIVO',
            recertification_valid_until: new Date(Date.now() + 200 * 86400000).toISOString(),
          }],
        });

      const result = await service.graduateStudent(mockContext, 'stu-1', { completionDate: '2026-09-01' });

      expect(result).toMatchObject({ studentId: 'stu-1', status: 'APROVADO' });
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'STUDENT', actionType: 'CERTIFICATE_ISSUED' }),
      );
    });
  });

  describe('4. Examinador: recertificação vencida (24 meses) bloqueia bancas', () => {
    it('pure: examiner recertification is valid for 24 months', () => {
      const validUntil = TrainingService.computeExaminerValidUntil('2026-01-10');
      expect(validUntil.getFullYear()).toBe(2028);
      expect(TrainingService.isExaminerRecertificationExpired(new Date(Date.now() - 86400000).toISOString())).toBe(true);
    });

    it('graduateStudent blocks when no examiner with valid recertification exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [studentRow] }) // teoria válida
        .mockResolvedValueOnce({ rows: [] }); // nenhum examinador ATIVO

      await expect(
        service.graduateStudent(mockContext, 'stu-1', { completionDate: '2026-09-01' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('5. FSTD: qualificação vencida bloqueia sessões de treinamento', () => {
    it('pure: expired FSTD qualification is detected', () => {
      expect(TrainingService.isFstdQualificationExpired(new Date(Date.now() - 86400000).toISOString())).toBe(true);
      expect(TrainingService.isFstdQualificationExpired(new Date(Date.now() + 86400000).toISOString())).toBe(false);
    });

    it('createStudentRecord blocks a FICHA_VOO session on an expired FSTD (RBAC 60)', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [studentRow] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'fstd-1',
            tenant_id: 'tenant-456',
            center_id: 'center-1',
            device_type: 'FFS',
            qualification_level: 'LEVEL_D',
            qualification_expiry: new Date(Date.now() - 10 * 86400000).toISOString(),
            status: 'QUALIFICACAO_VENCIDA',
          }],
        });

      await expect(
        service.createStudentRecord(mockContext, {
          studentId: 'stu-1',
          recordType: 'FICHA_VOO',
          fstdDeviceId: 'fstd-1',
          date: '2026-09-01',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('6. S141: sincronização bidirecional das situações do aluno', () => {
    it('enrolls with MATRICULADO and transfers with TRANSFERIDO, anchoring each situation', async () => {
      // Matrícula
      mockDb.query
        .mockResolvedValueOnce({ rows: [centerRow] })
        .mockResolvedValueOnce({ rows: [studentRow] });
      await service.enrollStudent(mockContext, {
        centerId: 'center-1',
        personId: 'person-1',
        enrollmentCode: 'S141-2026-0001',
        courseType: 'PP',
        enrollmentDate: '2026-09-01',
        courseDurationMonths: 12,
      });

      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'STUDENT', actionType: 'STUDENT_ENROLLED', payload: expect.objectContaining({ situation: 'MATRICULADO', maxDurationMonths: 24 }) }),
      );

      // Transferência externa
      mockDb.query.mockResolvedValueOnce({ rows: [studentRow] });
      const transfer = await service.transferStudent(mockContext, 'stu-1', {
        externalCenterCode: 'CIAC-EXTERNO-01',
        reason: 'Mudança de domicílio',
      });

      expect(transfer).toMatchObject({ status: 'TRANSFERIDO', externalCenterCode: 'CIAC-EXTERNO-01' });
      expect(mockLedger.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'STUDENT', actionType: 'STUDENT_TRANSFERRED', payload: expect.objectContaining({ situation: 'TRANSFERIDO' }) }),
      );
    });
  });

  describe('8. CTAC: instrutor exige 8 horas pedagógicas (IS 142-003)', () => {
    it('registerInstructor blocks CTAC instructor with fewer than 8 pedagogical hours', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ ...centerRow, center_type: 'CTAC', et_number: 'ET-142-01' }] });

      await expect(
        service.registerInstructor(mockContext, {
          centerId: 'center-1',
          personId: 'person-1',
          instructorType: 'VOO',
          pedagogicalHours: 6,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('5 anos: retenção de fichas de instrução (IS 141-006)', () => {
    it('pure: student records are retained for 5 years', () => {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      expect(TrainingService.isRecordRetentionExpired(sixYearsAgo)).toBe(true);
    });
  });

  describe('Ancoragem: matrícula, certificado e fichas geram blocos no ledger', () => {
    it('appends ledger blocks for enrollment, graduation and student records', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [centerRow] })
        .mockResolvedValueOnce({ rows: [studentRow] });
      await service.enrollStudent(mockContext, {
        centerId: 'center-1',
        personId: 'person-1',
        enrollmentCode: 'S141-2026-0002',
        courseType: 'PP',
        enrollmentDate: '2026-09-01',
        courseDurationMonths: 12,
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [studentRow] })
        .mockResolvedValueOnce({ rows: [{ id: 'inst-1', center_id: 'center-1', instructor_type: 'EXAMINADOR', status: 'ATIVO', recertification_valid_until: new Date(Date.now() + 200 * 86400000).toISOString() }] });
      await service.graduateStudent(mockContext, 'stu-1', { completionDate: '2026-09-01' });

      mockDb.query.mockResolvedValueOnce({ rows: [studentRow] });
      await service.createStudentRecord(mockContext, {
        studentId: 'stu-1',
        recordType: 'NOTA',
        subject: 'Teoria de Voo',
        score: 9.5,
        date: '2026-09-01',
      });

      const actions = mockLedger.append.mock.calls.map((call: Array<unknown>) => (call[2] as { actionType: string }).actionType);
      expect(actions).toContain('STUDENT_ENROLLED');
      expect(actions).toContain('CERTIFICATE_ISSUED');
      expect(actions).toContain('STUDENT_RECORD_CREATED');
    });
  });
});