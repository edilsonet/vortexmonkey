import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import { assertCoverage, coverage, drawIds, sampleSize, toxValidUntil } from "./ppsp.policy.ts";
import type { AddMemberDto, CreateProgramDto, DrawDto, RecordExamDto } from "./ppsp.dto.ts";

@Injectable()
export class PpspService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const programs = await client.query(
        `SELECT p.id, p.year, p.status, p.company_id, c.corporate_name, p.arso_person_id, pe.full_name AS arso_name,
                (SELECT count(*)::int FROM compliance.ppsp_members m WHERE m.program_id = p.id) AS members
         FROM compliance.ppsp_programs p
         JOIN identity.companies c ON c.id = p.company_id
         JOIN identity.people pe ON pe.id = p.arso_person_id
         ORDER BY p.year DESC`,
      );
      const exams = await client.query(
        `SELECT id, person_id, company_id, collected_at, valid_until, result, created_at
         FROM compliance.ppsp_exams ORDER BY collected_at DESC LIMIT 50`,
      );
      const draws = await client.query(
        `SELECT d.id, d.year, d.pool_size, d.sample_size, d.coverage, d.seed, d.program_id, d.created_at
         FROM compliance.ppsp_draws d ORDER BY d.created_at DESC LIMIT 20`,
      );
      return { programs: programs.rows, exams: exams.rows, draws: draws.rows };
    });
  }

  public createProgram(ctx: RequestContext, dto: CreateProgramDto) {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO compliance.ppsp_programs(tenant_id, company_id, year, arso_person_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (company_id, year) DO UPDATE SET arso_person_id = EXCLUDED.arso_person_id
         RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.year, dto.arsoPersonId],
      );
      const id = inserted.rows[0]!.id;
      await client.query(
        `INSERT INTO compliance.ppsp_members(program_id, person_id, safety_sensitive)
         VALUES ($1,$2,true)
         ON CONFLICT (program_id, person_id) DO NOTHING`,
        [id, dto.arsoPersonId],
      );
      const block = await this.ledger.append(client, ctx, {
        entityType: "PPSP",
        entityId: id,
        actionType: "PROGRAM_UPSERT",
        payload: dto,
      });
      await client.query("UPDATE compliance.ppsp_programs SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `PPSP ${dto.year} ARSO`,
        entityType: "PPSP",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public addMember(ctx: RequestContext, programId: string, dto: AddMemberDto) {
    return this.db.withContext(ctx, async (client) => {
      const program = await client.query("SELECT id FROM compliance.ppsp_programs WHERE id = $1", [programId]);
      if (!program.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "Programa PPSP nao encontrado." });
      await client.query(
        `INSERT INTO compliance.ppsp_members(program_id, person_id, safety_sensitive)
         VALUES ($1,$2,$3)
         ON CONFLICT (program_id, person_id) DO UPDATE SET safety_sensitive = EXCLUDED.safety_sensitive`,
        [programId, dto.personId, dto.safetySensitive ?? true],
      );
      return { programId, personId: dto.personId };
    });
  }

  public recordExam(ctx: RequestContext, dto: RecordExamDto) {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
    const collected = new Date(`${dto.collectedAt}T00:00:00Z`);
    const { validUntil } = toxValidUntil(collected);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO compliance.ppsp_exams(tenant_id, company_id, person_id, collected_at, valid_until, result)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.personId, dto.collectedAt, validUntil.toISOString().slice(0, 10), dto.result],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "PPSP_EXAM",
        entityId: id,
        actionType: "TOX_RECORD",
        payload: { ...dto, validUntil: validUntil.toISOString().slice(0, 10) },
      });
      await client.query("UPDATE compliance.ppsp_exams SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, validUntil: validUntil.toISOString().slice(0, 10) };
    });
  }

  public draw(ctx: RequestContext, programId: string, dto: DrawDto) {
    return this.db.withContext(ctx, async (client) => {
      const program = await client.query<{ id: string; year: number }>(
        "SELECT id, year FROM compliance.ppsp_programs WHERE id = $1",
        [programId],
      );
      const prog = program.rows[0];
      if (!prog) throw new NotFoundException({ code: "NOT_FOUND", message: "Programa PPSP nao encontrado." });
      const members = await client.query<{ person_id: string }>(
        `SELECT person_id FROM compliance.ppsp_members WHERE program_id = $1 AND safety_sensitive = true`,
        [programId],
      );
      const pool = members.rows.map((r) => r.person_id);
      const size = sampleSize(pool.length);
      if (size === 0) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Sem membros sensiveis para sorteio." });
      }
      const seed = dto.seed?.trim() || `${prog.year}:${programId}:${Date.now()}`;
      const selected = drawIds(pool, size, seed);
      assertCoverage(selected.length, pool.length);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO compliance.ppsp_draws(program_id, year, pool_size, sample_size, coverage, seed)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [programId, prog.year, pool.length, selected.length, coverage(selected.length, pool.length), seed],
      );
      const id = inserted.rows[0]!.id;
      for (const personId of selected) {
        await client.query(`INSERT INTO compliance.ppsp_draw_members(draw_id, person_id) VALUES ($1,$2)`, [id, personId]);
      }
      const block = await this.ledger.append(client, ctx, {
        entityType: "PPSP_DRAW",
        entityId: id,
        actionType: "ANNUAL_DRAW",
        payload: { pool: pool.length, sample: selected.length, coverage: coverage(selected.length, pool.length) },
      });
      await client.query("UPDATE compliance.ppsp_draws SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `PPSP sorteio ${prog.year}`,
        entityType: "PPSP_DRAW",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number, selected, coverage: coverage(selected.length, pool.length) };
    });
  }
}
