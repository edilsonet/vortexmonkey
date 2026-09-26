import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  CERTIFICATE_ISSUANCE_DAYS,
  CTAC_PEDAGOGICAL_HOURS_REQUIRED,
  EXAMINER_RECERTIFICATION_MONTHS,
  GROUND_SCHOOL_VALIDITY_MONTHS,
  PHASE_7_TRAINING_EVENTS,
  S141_DOUBLE_PERIOD_FACTOR,
  STUDENT_RECORDS_RETENTION_YEARS,
  type CourseType,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type {
  CreateStudentRecordDto,
  CreateTrainingCenterDto,
  CreateTrainingDocumentDto,
  EnrollStudentDto,
  GraduateStudentDto,
  RegisterFstdDeviceDto,
  RegisterInstructorDto,
  TransferStudentDto,
} from './training.dto';

/**
 * Converte data: strings 'YYYY-MM-DD' são ancoradas ao meio-dia UTC para evitar
 * deslocamento de fuso (meia-noite UTC vira o dia anterior em UTC-3), mantendo o
 * cálculo em JavaScript alinhado ao que é armazenado no PostgreSQL.
 */
const parseDate = (value: string): Date => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value));

const asDate = (value: string | Date): Date => (typeof value === 'string' ? parseDate(value) : new Date(value));

interface TrainingCenterRow {
  id: string; tenant_id: string; company_id: string; center_type: string;
  ciac_type: string | null; ei_number: string | null; et_number: string | null;
  status: string; s141_status: string | null;
}

interface StudentRow {
  id: string; tenant_id: string; center_id: string; person_id: string;
  enrollment_code: string; course_type: CourseType; status: string;
  enrollment_date: string; course_duration_months: number;
  max_duration_months: number; theory_evaluation_date: string | null;
  theory_valid_until: string | null;
}

interface InstructorRow {
  id: string; tenant_id: string; center_id: string; person_id: string;
  instructor_type: string; pedagogical_hours: number;
  recertification_date: string | null; recertification_valid_until: string | null;
  status: string;
}

interface FstdRow {
  id: string; tenant_id: string; center_id: string; device_type: string;
  qualification_level: string; qualification_expiry: string | null; status: string;
}

/** Cursos que exigem banca com examinador credenciado. */
const EXAMINER_BOARD_COURSES: readonly CourseType[] = ['PP', 'PC', 'PLA', 'IFR', 'COMISSARIO'];

@Injectable()
export class TrainingService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  // ─────────────────────────────────────────────
  // Regras puras (testáveis)
  // ─────────────────────────────────────────────

  /** S141 (IS 141-001): aluno no dobro do período letivo homologado é cancelado. */
  public static isDoublePeriodExceeded(enrollmentDate: string | Date, maxDurationMonths: number): boolean {
    const limit = asDate(enrollmentDate);
    limit.setMonth(limit.getMonth() + maxDurationMonths);
    return limit < new Date();
  }

  /** Ground school: avaliação teórica válida por 12 meses. */
  public static computeTheoryValidUntil(evaluationDate: string | Date): Date {
    const validUntil = asDate(evaluationDate);
    validUntil.setMonth(validUntil.getMonth() + GROUND_SCHOOL_VALIDITY_MONTHS);
    return validUntil;
  }

  public static isTheoryExpired(theoryValidUntil: string | Date | null): boolean {
    if (!theoryValidUntil) return true;
    return asDate(theoryValidUntil) < new Date();
  }

  /** Certificado de conclusão: emitido em até 10 dias corridos após o término. */
  public static computeCertificateDueDate(completionDate: string | Date): Date {
    const due = asDate(completionDate);
    due.setDate(due.getDate() + CERTIFICATE_ISSUANCE_DAYS);
    return due;
  }

  /** Examinadores: recertificação a cada 24 meses; vencido bloqueia bancas. */
  public static computeExaminerValidUntil(recertificationDate: string | Date): Date {
    const validUntil = asDate(recertificationDate);
    validUntil.setMonth(validUntil.getMonth() + EXAMINER_RECERTIFICATION_MONTHS);
    return validUntil;
  }

  public static isExaminerRecertificationExpired(validUntil: string | Date | null): boolean {
    if (!validUntil) return true;
    return asDate(validUntil) < new Date();
  }

  /** FSTD (RBAC 60): qualificação vencida bloqueia sessões de treinamento. */
  public static isFstdQualificationExpired(qualificationExpiry: string | Date | null): boolean {
    if (!qualificationExpiry) return false;
    return asDate(qualificationExpiry) < new Date();
  }

  /** Fichas de instrução e avaliações guardadas por 5 anos (IS 141-006). */
  public static isRecordRetentionExpired(recordDate: string | Date): boolean {
    const limit = asDate(recordDate);
    limit.setFullYear(limit.getFullYear() + STUDENT_RECORDS_RETENTION_YEARS);
    return limit < new Date();
  }

  // ─────────────────────────────────────────────
  // Centros de instrução (CIAC) e treinamento (CTAC)
  // ─────────────────────────────────────────────

  /** POST /training-centers — Cadastra CIAC (RBAC 141) ou CTAC (RBAC 142). */
  public async registerTrainingCenter(context: RequestContext, dto: CreateTrainingCenterDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const centerId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<TrainingCenterRow>(
        `INSERT INTO ops.training_centers
          (id, tenant_id, company_id, center_type, ciac_type, certificate_number, certificate_validity, ei_number, et_number, s141_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [centerId, context.tenantId, dto.companyId, dto.centerType, dto.ciacType ?? null,
          dto.certificateNumber ?? null, dto.certificateValidity ? new Date(dto.certificateValidity) : null,
          dto.eiNumber ?? null, dto.etNumber ?? null, dto.s141Status ?? null],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'TRAINING_CENTER', entityId: centerId,
        actionType: PHASE_7_TRAINING_EVENTS.CENTER_REGISTERED,
        payload: { centerId, centerType: dto.centerType, companyId: dto.companyId },
      });

      return result.rows[0];
    });
  }

  /** GET /training-centers — Lista centros do tenant. */
  public listTrainingCenters(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query<TrainingCenterRow>(
        'SELECT * FROM ops.training_centers WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows);
  }

  /** POST /training-documents — Cadastra MIP/MGQ/MGSO/PRE. */
  public async createTrainingDocument(context: RequestContext, dto: CreateTrainingDocumentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const center = (await client.query<TrainingCenterRow>(
        'SELECT * FROM ops.training_centers WHERE id = $1 AND tenant_id = $2',
        [dto.centerId, context.tenantId],
      )).rows[0];

      if (!center) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Centro de instrução não encontrado no tenant.' });

      const documentId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query(
        `INSERT INTO ops.training_documents
          (id, center_id, document_type, title, current_version)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [documentId, dto.centerId, dto.documentType, dto.title, dto.currentVersion ?? '1.0'],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'TRAINING_DOCUMENT', entityId: documentId,
        actionType: PHASE_7_TRAINING_EVENTS.TRAINING_DOCUMENT_CREATED,
        payload: { documentId, centerId: dto.centerId, documentType: dto.documentType, title: dto.title },
      });

      return result.rows[0];
    });
  }

  /** GET /training-documents — Lista documentos do tenant. */
  public listTrainingDocuments(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT d.* FROM ops.training_documents d
         JOIN ops.training_centers c ON c.id = d.center_id
         WHERE c.tenant_id = $1 ORDER BY d.created_at DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // Alunos e matrículas (S141)
  // ─────────────────────────────────────────────

  /** POST /students — Matricula aluno com dobro do período letivo e validade teórica de 12 meses. */
  public async enrollStudent(context: RequestContext, dto: EnrollStudentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const center = (await client.query<TrainingCenterRow>(
        'SELECT * FROM ops.training_centers WHERE id = $1 AND tenant_id = $2',
        [dto.centerId, context.tenantId],
      )).rows[0];

      if (!center) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Centro de instrução não encontrado no tenant.' });

      const studentId = randomUUID();
      const ledgerId = randomUUID();
      const maxDurationMonths = dto.courseDurationMonths * S141_DOUBLE_PERIOD_FACTOR;
      const theoryValidUntil = dto.theoryEvaluationDate
        ? TrainingService.computeTheoryValidUntil(dto.theoryEvaluationDate)
        : null;

      const result = await client.query<StudentRow>(
        `INSERT INTO ops.students
          (id, tenant_id, center_id, person_id, enrollment_code, course_type, status, enrollment_date,
           course_duration_months, max_duration_months, theory_evaluation_date, theory_valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, 'MATRICULADO', $7, $8, $9, $10, $11) RETURNING *`,
        [studentId, context.tenantId, dto.centerId, dto.personId, dto.enrollmentCode, dto.courseType,
          parseDate(dto.enrollmentDate), dto.courseDurationMonths, maxDurationMonths,
          dto.theoryEvaluationDate ? parseDate(dto.theoryEvaluationDate) : null, theoryValidUntil],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'STUDENT', entityId: studentId,
        actionType: PHASE_7_TRAINING_EVENTS.STUDENT_ENROLLED,
        payload: { studentId, enrollmentCode: dto.enrollmentCode, courseType: dto.courseType, maxDurationMonths, situation: 'MATRICULADO' },
      });

      return result.rows[0];
    });
  }

  /** GET /students — Lista alunos, aplicando o cancelamento automático do dobro do período (S141). */
  public listStudents(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const cancelled = (await client.query<{ id: string }>(
        `UPDATE ops.students SET status = 'CANCELADO', updated_at = now()
         WHERE tenant_id = $1 AND status = 'MATRICULADO'
           AND enrollment_date + (max_duration_months * interval '1 month') < CURRENT_DATE
         RETURNING id`,
        [context.tenantId],
      )).rows;

      for (const row of cancelled) {
        const ledgerId = randomUUID();
        await this.ledger.append(client, context, {
          id: ledgerId, entityType: 'STUDENT', entityId: row.id,
          actionType: PHASE_7_TRAINING_EVENTS.S141_SITUATION_UPDATED,
          payload: { studentId: row.id, situation: 'CANCELADO', reason: 'dobro do período letivo homologado (S141)' },
        });
      }

      return (await client.query<StudentRow>(
        'SELECT * FROM ops.students WHERE tenant_id = $1 ORDER BY enrollment_date DESC',
        [context.tenantId],
      )).rows;
    });
  }

  /** POST /students/:id/transfer — Transferência externa (S141) com as 6 situações sincronizadas. */
  public async transferStudent(context: RequestContext, studentId: string, dto: TransferStudentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const student = (await client.query<StudentRow>(
        'SELECT * FROM ops.students WHERE id = $1 AND tenant_id = $2',
        [studentId, context.tenantId],
      )).rows[0];

      if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aluno não encontrado no tenant.' });
      if (student.status !== 'MATRICULADO') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Somente alunos MATRICULADO podem ser transferidos.' });
      }

      const ledgerId = randomUUID();
      await client.query(
        `UPDATE ops.students SET status = 'TRANSFERIDO', updated_at = now() WHERE id = $1`,
        [studentId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'STUDENT', entityId: studentId,
        actionType: PHASE_7_TRAINING_EVENTS.STUDENT_TRANSFERRED,
        payload: { studentId, situation: 'TRANSFERIDO', externalCenterCode: dto.externalCenterCode, reason: dto.reason },
      });

      return { studentId, status: 'TRANSFERIDO', externalCenterCode: dto.externalCenterCode };
    });
  }

  /** POST /students/:id/graduate — Conclusão + certificado em até 10 dias (com banca de examinador válida). */
  public async graduateStudent(context: RequestContext, studentId: string, dto: GraduateStudentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const student = (await client.query<StudentRow>(
        'SELECT * FROM ops.students WHERE id = $1 AND tenant_id = $2',
        [studentId, context.tenantId],
      )).rows[0];

      if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aluno não encontrado no tenant.' });
      if (student.status !== 'MATRICULADO') {
        throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Somente alunos MATRICULADO podem ser aprovados.' });
      }

      // Regra 1: dobro do período letivo excedido invalida a conclusão
      if (TrainingService.isDoublePeriodExceeded(student.enrollment_date, student.max_duration_months)) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'VIOLAÇÃO S141: aluno excedeu o dobro do período letivo homologado; matrícula cancelada.',
        });
      }

      // Regra 2: avaliação teórica de ground school vencida (12 meses) invalida o aproveitamento
      if (TrainingService.isTheoryExpired(student.theory_valid_until)) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: 'VIOLAÇÃO IS 141-006: avaliação teórica de ground school expirada (12 meses); aproveitamento invalidado.',
        });
      }

      // Regra 4: cursos com banca exigem examinador credenciado com recertificação válida (24 meses)
      if (EXAMINER_BOARD_COURSES.includes(student.course_type)) {
        const activeExaminer = (await client.query<InstructorRow>(
          `SELECT * FROM ops.instructors
           WHERE center_id = $1 AND instructor_type = 'EXAMINADOR' AND status = 'ATIVO'
             AND recertification_valid_until >= CURRENT_DATE
           LIMIT 1`,
          [student.center_id],
        )).rows[0];

        if (!activeExaminer) {
          throw new UnprocessableEntityException({
            code: 'VALIDATION_ERROR',
            message: 'VIOLAÇÃO RBAC 141.75: banca exige examinador credenciado com recertificação válida (24 meses).',
          });
        }
      }

      const certificateDueDate = TrainingService.computeCertificateDueDate(dto.completionDate);
      const ledgerId = randomUUID();

      await client.query(
        `UPDATE ops.students SET status = 'APROVADO', updated_at = now() WHERE id = $1`,
        [studentId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'STUDENT', entityId: studentId,
        actionType: PHASE_7_TRAINING_EVENTS.CERTIFICATE_ISSUED,
        payload: { studentId, situation: 'APROVADO', completionDate: dto.completionDate, certificateDueDate: certificateDueDate.toISOString(), dueWithinDays: CERTIFICATE_ISSUANCE_DAYS },
      });

      return { studentId, status: 'APROVADO', certificateDueDate: certificateDueDate.toISOString() };
    });
  }

  // ─────────────────────────────────────────────
  // Registros escolares (fichas 5 anos)
  // ─────────────────────────────────────────────

  /** POST /student-records — Registra ficha/avaliação (FSTD vencido bloqueia sessão). */
  public async createStudentRecord(context: RequestContext, dto: CreateStudentRecordDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const student = (await client.query<StudentRow>(
        'SELECT * FROM ops.students WHERE id = $1 AND tenant_id = $2',
        [dto.studentId, context.tenantId],
      )).rows[0];

      if (!student) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Aluno não encontrado no tenant.' });

      // Regra 10: FSTD com qualificação vencida bloqueia sessões de treinamento
      if (dto.fstdDeviceId) {
        const fstd = (await client.query<FstdRow>(
          'SELECT * FROM ops.fstd_devices WHERE id = $1 AND tenant_id = $2',
          [dto.fstdDeviceId, context.tenantId],
        )).rows[0];

        if (!fstd) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Dispositivo FSTD não encontrado.' });
        if (fstd.status === 'QUALIFICACAO_VENCIDA' || TrainingService.isFstdQualificationExpired(fstd.qualification_expiry)) {
          throw new UnprocessableEntityException({
            code: 'VALIDATION_ERROR',
            message: 'VIOLAÇÃO RBAC 60: FSTD com qualificação vencida bloqueia sessões de treinamento.',
          });
        }
      }

      const recordId = randomUUID();
      const ledgerId = randomUUID();
      const contentHash = createHash('sha256')
        .update(JSON.stringify({
          studentId: dto.studentId, recordType: dto.recordType, subject: dto.subject ?? null,
          score: dto.score ?? null, flightHours: dto.flightHours ?? null, instructorId: dto.instructorId ?? null,
          fstdDeviceId: dto.fstdDeviceId ?? null, date: dto.date,
        }))
        .digest('hex');

      const result = await client.query(
        `INSERT INTO ops.student_records
          (id, student_id, record_type, subject, score, flight_hours, instructor_id, fstd_device_id, date, content_hash, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [recordId, dto.studentId, dto.recordType, dto.subject ?? null, dto.score ?? null,
          dto.flightHours ?? null, dto.instructorId ?? null, dto.fstdDeviceId ?? null,
          parseDate(dto.date), contentHash, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'STUDENT_RECORD', entityId: recordId,
        actionType: PHASE_7_TRAINING_EVENTS.STUDENT_RECORD_CREATED,
        payload: { recordId, studentId: dto.studentId, recordType: dto.recordType, contentHash },
      });

      return result.rows[0];
    });
  }

  /** GET /student-records — Lista registros escolares do tenant. */
  public listStudentRecords(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) =>
      (await client.query(
        `SELECT r.* FROM ops.student_records r
         JOIN ops.students s ON s.id = r.student_id
         WHERE s.tenant_id = $1 ORDER BY r.date DESC`,
        [context.tenantId],
      )).rows);
  }

  // ─────────────────────────────────────────────
  // FSTD (RBAC 60)
  // ─────────────────────────────────────────────

  /** POST /fstd-devices — Cadastra dispositivo com status de qualificação. */
  public async registerFstdDevice(context: RequestContext, dto: RegisterFstdDeviceDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const center = (await client.query<TrainingCenterRow>(
        'SELECT * FROM ops.training_centers WHERE id = $1 AND tenant_id = $2',
        [dto.centerId, context.tenantId],
      )).rows[0];

      if (!center) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Centro de instrução não encontrado no tenant.' });

      const fstdId = randomUUID();
      const ledgerId = randomUUID();
      const expiry = dto.qualificationExpiry ? parseDate(dto.qualificationExpiry) : null;
      const expired = TrainingService.isFstdQualificationExpired(expiry);
      const status = expired ? 'QUALIFICACAO_VENCIDA' : 'QUALIFICADO';

      const result = await client.query<FstdRow>(
        `INSERT INTO ops.fstd_devices
          (id, tenant_id, center_id, device_type, qualification_level, qualification_expiry, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [fstdId, context.tenantId, dto.centerId, dto.deviceType, dto.qualificationLevel, expiry, status],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'FSTD_DEVICE', entityId: fstdId,
        actionType: expired ? PHASE_7_TRAINING_EVENTS.FSTD_QUALIFICATION_EXPIRED : PHASE_7_TRAINING_EVENTS.FSTD_REGISTERED,
        payload: { fstdId, centerId: dto.centerId, deviceType: dto.deviceType, qualificationLevel: dto.qualificationLevel, status },
      });

      return result.rows[0];
    });
  }

  /** GET /fstd-devices — Lista dispositivos, derivando status de qualificação vencida. */
  public listFstdDevices(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = (await client.query<FstdRow>(
        'SELECT * FROM ops.fstd_devices WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows;
      return rows.map((row) => ({
        ...row,
        status: row.status === 'QUALIFICADO' && TrainingService.isFstdQualificationExpired(row.qualification_expiry)
          ? 'QUALIFICACAO_VENCIDA'
          : row.status,
      }));
    });
  }

  // ─────────────────────────────────────────────
  // Instrutores
  // ─────────────────────────────────────────────

  /** POST /instructors — Cadastra instrutor (CTAC exige 8 horas pedagógicas; examinador 24 meses). */
  public async registerInstructor(context: RequestContext, dto: RegisterInstructorDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const center = (await client.query<TrainingCenterRow>(
        'SELECT * FROM ops.training_centers WHERE id = $1 AND tenant_id = $2',
        [dto.centerId, context.tenantId],
      )).rows[0];

      if (!center) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Centro de instrução não encontrado no tenant.' });

      // Regra 8 (IS 142-003): instrutor de CTAC exige 8 horas de treinamento pedagógico inicial
      if (center.center_type === 'CTAC' && (dto.pedagogicalHours ?? CTAC_PEDAGOGICAL_HOURS_REQUIRED) < CTAC_PEDAGOGICAL_HOURS_REQUIRED) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: `VIOLAÇÃO IS 142-003: instrutor de CTAC exige ${CTAC_PEDAGOGICAL_HOURS_REQUIRED} horas pedagógicas iniciais.`,
        });
      }

      const instructorId = randomUUID();
      const ledgerId = randomUUID();
      const recertificationValidUntil = dto.recertificationDate
        ? TrainingService.computeExaminerValidUntil(dto.recertificationDate)
        : null;
      const expired = dto.instructorType === 'EXAMINADOR'
        && TrainingService.isExaminerRecertificationExpired(recertificationValidUntil);
      const status = expired ? 'RECERTIFICACAO_VENCIDA' : 'ATIVO';

      const result = await client.query<InstructorRow>(
        `INSERT INTO ops.instructors
          (id, tenant_id, center_id, person_id, instructor_type, pedagogical_hours, recertification_date, recertification_valid_until, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [instructorId, context.tenantId, dto.centerId, dto.personId, dto.instructorType,
          dto.pedagogicalHours ?? CTAC_PEDAGOGICAL_HOURS_REQUIRED,
          dto.recertificationDate ? parseDate(dto.recertificationDate) : null, recertificationValidUntil, status],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'INSTRUCTOR', entityId: instructorId,
        actionType: expired ? PHASE_7_TRAINING_EVENTS.INSTRUCTOR_RECERTIFICATION_EXPIRED : PHASE_7_TRAINING_EVENTS.INSTRUCTOR_REGISTERED,
        payload: { instructorId, centerId: dto.centerId, instructorType: dto.instructorType, pedagogicalHours: dto.pedagogicalHours ?? CTAC_PEDAGOGICAL_HOURS_REQUIRED, status },
      });

      return result.rows[0];
    });
  }

  /** GET /instructors — Lista instrutores com recertificação derivada. */
  public listInstructors(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = (await client.query<InstructorRow>(
        'SELECT * FROM ops.instructors WHERE tenant_id = $1 ORDER BY created_at DESC',
        [context.tenantId],
      )).rows;
      return rows.map((row) => ({
        ...row,
        status: row.instructor_type === 'EXAMINADOR' && row.status === 'ATIVO'
          && TrainingService.isExaminerRecertificationExpired(row.recertification_valid_until)
          ? 'RECERTIFICACAO_VENCIDA'
          : row.status,
      }));
    });
  }

  // ─────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────

  /** GET /training/dashboard — KPIs do ERP 141/142. */
  public async getTrainingDashboard(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const [centers, students, records, fstd, instructors] = await Promise.all([
        client.query(`SELECT center_type, status, COUNT(*) AS count FROM ops.training_centers WHERE tenant_id = $1 GROUP BY center_type, status`, [context.tenantId]),
        client.query(`SELECT status, COUNT(*) AS count FROM ops.students WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT record_type, COUNT(*) AS count FROM ops.student_records r JOIN ops.students s ON s.id = r.student_id WHERE s.tenant_id = $1 GROUP BY record_type`, [context.tenantId]),
        client.query(`SELECT status, COUNT(*) AS count FROM ops.fstd_devices WHERE tenant_id = $1 GROUP BY status`, [context.tenantId]),
        client.query(`SELECT instructor_type, status, COUNT(*) AS count FROM ops.instructors WHERE tenant_id = $1 GROUP BY instructor_type, status`, [context.tenantId]),
      ]);

      const certificatesDue = await client.query(
        `SELECT COUNT(*) AS count FROM ops.students
         WHERE tenant_id = $1 AND status = 'APROVADO'
           AND theory_valid_until >= CURRENT_DATE`,
        [context.tenantId],
      );

      return {
        tenantId: context.tenantId,
        centers: centers.rows,
        students: students.rows,
        studentRecords: records.rows,
        fstdDevices: fstd.rows,
        instructors: instructors.rows,
        certificatesValidCount: Number(certificatesDue.rows[0]?.count ?? 0),
        retentionYears: STUDENT_RECORDS_RETENTION_YEARS,
      };
    });
  }
}