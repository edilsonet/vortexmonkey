import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import {
  assertCtacPedagogicalHours,
  assertFstdUsable,
  assertGraduate,
  certificateDueDate,
  isS141Overdue,
  maxDurationMonths,
  PHASE_7_TRAINING_EVENTS,
  theoryValidUntil,
  type FstdStatus,
  type InstructorStatus,
  type TrainingCenterType,
} from "./training.policy.ts";
import type {
  CreateCenterDto,
  CreateCourseDto,
  CreateFstdDto,
  CreateInstructorDto,
  EnrollStudentDto,
  SessionDto,
} from "./training.dto.ts";

@Injectable()
export class TrainingService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const centers = await client.query(
        `SELECT c.id, c.center_type, c.ciac_type, c.certificate_number, c.status, c.s141_status, co.corporate_name
         FROM training.centers c JOIN identity.companies co ON co.id = c.company_id
         ORDER BY c.created_at DESC`,
      );
      const courses = await client.query(
        `SELECT id, center_id, course_type, title, duration_months, sell_on_rloja FROM training.courses ORDER BY created_at DESC`,
      );
      const students = await client.query(
        `SELECT s.id, s.enrollment_code, s.course_type, s.status, s.enrollment_date, s.max_duration_months,
                s.theory_valid_until, s.certificate_due, p.full_name
         FROM training.students s JOIN identity.people p ON p.id = s.person_id
         ORDER BY s.created_at DESC LIMIT 50`,
      );
      const fstd = await client.query(
        `SELECT id, device_type, qualification_level, qualification_expiry, status FROM training.fstd_devices ORDER BY created_at DESC`,
      );
      const instructors = await client.query(
        `SELECT i.id, i.instructor_type, i.pedagogical_hours, i.status, i.recertification_valid_until, p.full_name
         FROM training.instructors i JOIN identity.people p ON p.id = i.person_id
         ORDER BY i.created_at DESC`,
      );
      const counts = await client.query<{
        centers: number;
        courses: number;
        students: number;
        fstd: number;
      }>(
        `SELECT
           (SELECT count(*)::int FROM training.centers) AS centers,
           (SELECT count(*)::int FROM training.courses) AS courses,
           (SELECT count(*)::int FROM training.students WHERE status = 'MATRICULADO') AS students,
           (SELECT count(*)::int FROM training.fstd_devices) AS fstd`,
      );
      return {
        counts: counts.rows[0],
        centers: centers.rows,
        courses: courses.rows,
        students: students.rows,
        fstd: fstd.rows,
        instructors: instructors.rows,
      };
    });
  }

  public createCenter(ctx: RequestContext, dto: CreateCenterDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO training.centers(tenant_id, company_id, center_type, ciac_type, certificate_number, ei_number, et_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          ctx.tenantId,
          dto.companyId,
          dto.centerType,
          dto.ciacType ?? null,
          dto.certificateNumber ?? null,
          dto.eiNumber ?? null,
          dto.etNumber ?? null,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_CENTER",
        entityId: id,
        actionType: PHASE_7_TRAINING_EVENTS.CENTER_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE training.centers SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `${dto.centerType} ${dto.certificateNumber ?? id}`,
        entityType: "TR_CENTER",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public createCourse(ctx: RequestContext, dto: CreateCourseDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO training.courses(tenant_id, center_id, course_type, title, duration_months, sell_on_rloja)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ctx.tenantId, dto.centerId, dto.courseType, dto.title, dto.durationMonths, dto.sellOnRloja !== false],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_COURSE",
        entityId: id,
        actionType: "COURSE_CREATED",
        payload: dto,
      });
      await client.query("UPDATE training.courses SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, sellOnRloja: dto.sellOnRloja !== false };
    });
  }

  public enroll(ctx: RequestContext, dto: EnrollStudentDto) {
    this.requireTenant(ctx);
    const max = maxDurationMonths(dto.durationMonths);
    const theoryUntil = dto.theoryEvaluationDate
      ? theoryValidUntil(new Date(`${dto.theoryEvaluationDate}T00:00:00Z`))
      : null;
    return this.db.withContext(ctx, async (client) => {
      const seq = await client.query<{ n: number }>(
        "SELECT coalesce(count(*),0)::int + 1 AS n FROM training.students WHERE tenant_id = $1",
        [ctx.tenantId],
      );
      const code = `S141-${String(seq.rows[0]!.n).padStart(5, "0")}`;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO training.students(
           tenant_id, center_id, course_id, person_id, enrollment_code, course_type,
           course_duration_months, max_duration_months, theory_evaluation_date, theory_valid_until
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          ctx.tenantId,
          dto.centerId,
          dto.courseId ?? null,
          dto.personId,
          code,
          dto.courseType,
          dto.durationMonths,
          max,
          dto.theoryEvaluationDate ?? null,
          theoryUntil ? theoryUntil.toISOString().slice(0, 10) : null,
        ],
      );
      const id = inserted.rows[0]!.id;
      if (isS141Overdue(new Date(), dto.durationMonths, new Date())) {
        await client.query("UPDATE training.students SET status = 'CANCELADO' WHERE id = $1", [id]);
      }
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_STUDENT",
        entityId: id,
        actionType: PHASE_7_TRAINING_EVENTS.STUDENT_ENROLLED,
        payload: { ...dto, enrollmentCode: code, maxDurationMonths: max },
      });
      await client.query("UPDATE training.students SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, enrollmentCode: code, maxDurationMonths: max };
    });
  }

  public graduate(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{
        id: string;
        enrollment_date: string;
        course_duration_months: number;
        theory_valid_until: string | null;
        status: string;
      }>(
        `SELECT id, enrollment_date::text, course_duration_months, theory_valid_until::text, status
         FROM training.students WHERE id = $1`,
        [id],
      );
      const student = row.rows[0];
      if (!student) throw new NotFoundException({ code: "NOT_FOUND", message: "Aluno nao encontrado." });
      const examiner = await client.query<{ status: InstructorStatus }>(
        `SELECT status FROM training.instructors WHERE instructor_type = 'EXAMINADOR' AND status = 'ATIVO' LIMIT 1`,
      );
      try {
        assertGraduate({
          enrollmentDate: new Date(`${student.enrollment_date}T00:00:00Z`),
          durationMonths: student.course_duration_months,
          now: new Date(),
          theoryValidUntilDate: student.theory_valid_until
            ? new Date(`${student.theory_valid_until}T00:00:00Z`)
            : new Date(0),
          examinerActive: (examiner.rowCount ?? 0) > 0,
        });
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Conclusao bloqueada.",
        });
      }
      const due = certificateDueDate(new Date());
      await client.query(
        "UPDATE training.students SET status = 'APROVADO', certificate_due = $2 WHERE id = $1",
        [id, due.toISOString().slice(0, 10)],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_STUDENT",
        entityId: id,
        actionType: PHASE_7_TRAINING_EVENTS.CERTIFICATE_ISSUED,
        payload: { due: due.toISOString().slice(0, 10) },
      });
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Certificado ${id}`,
        entityType: "TR_CERTIFICATE",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, status: "APROVADO", certificateDue: due.toISOString().slice(0, 10), protocol: proto.number };
    });
  }

  public createFstd(ctx: RequestContext, dto: CreateFstdDto) {
    this.requireTenant(ctx);
    const expired = dto.qualificationExpiry ? new Date(`${dto.qualificationExpiry}T00:00:00Z`) < new Date() : false;
    const status: FstdStatus = expired ? "QUALIFICACAO_VENCIDA" : "QUALIFICADO";
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO training.fstd_devices(tenant_id, center_id, device_type, qualification_level, qualification_expiry, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ctx.tenantId, dto.centerId, dto.deviceType, dto.qualificationLevel, dto.qualificationExpiry ?? null, status],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_FSTD",
        entityId: id,
        actionType: PHASE_7_TRAINING_EVENTS.FSTD_REGISTERED,
        payload: { ...dto, status },
      });
      await client.query("UPDATE training.fstd_devices SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, status };
    });
  }

  public session(ctx: RequestContext, dto: SessionDto) {
    return this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; status: FstdStatus }>(
        "SELECT id, status FROM training.fstd_devices WHERE id = $1",
        [dto.fstdId],
      );
      const device = row.rows[0];
      if (!device) throw new NotFoundException({ code: "NOT_FOUND", message: "FSTD nao encontrado." });
      try {
        assertFstdUsable(device.status);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Sessao bloqueada.",
        });
      }
      return { fstdId: dto.fstdId, allowed: true };
    });
  }

  public createInstructor(ctx: RequestContext, dto: CreateInstructorDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const center = await client.query<{ center_type: TrainingCenterType }>(
        "SELECT center_type FROM training.centers WHERE id = $1",
        [dto.centerId],
      );
      const c = center.rows[0];
      if (!c) throw new NotFoundException({ code: "NOT_FOUND", message: "Centro nao encontrado." });
      try {
        assertCtacPedagogicalHours(c.center_type, dto.pedagogicalHours ?? 0);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Horas pedagogicas.",
        });
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO training.instructors(tenant_id, center_id, person_id, instructor_type, pedagogical_hours)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, dto.centerId, dto.personId, dto.instructorType, dto.pedagogicalHours ?? 0],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "TR_INSTRUCTOR",
        entityId: id,
        actionType: PHASE_7_TRAINING_EVENTS.INSTRUCTOR_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE training.instructors SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
