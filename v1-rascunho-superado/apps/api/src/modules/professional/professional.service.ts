import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import type { CreateCivDto, CreateCmaDto, CreateExperienceDto, UpsertProfileDto } from "./professional.dto.ts";

@Injectable()
export class ProfessionalService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const profile = await client.query("SELECT * FROM professional.profiles WHERE person_id = $1", [ctx.personId]);
      const row = profile.rows[0];
      if (!row) return { profile: null, civ: [], cma: [], experiences: [], certificates: [] };
      const [civ, cma, experiences, certificates] = await Promise.all([
        client.query("SELECT * FROM professional.civ_records WHERE profile_id = $1 ORDER BY created_at DESC", [row.id]),
        client.query("SELECT * FROM professional.cma_records WHERE profile_id = $1 ORDER BY valid_until DESC", [row.id]),
        client.query("SELECT * FROM professional.experiences WHERE profile_id = $1 ORDER BY started_at DESC", [row.id]),
        client.query("SELECT * FROM professional.certificates WHERE profile_id = $1 ORDER BY issued_at DESC", [row.id]),
      ]);
      return { profile: row, civ: civ.rows, cma: cma.rows, experiences: experiences.rows, certificates: certificates.rows };
    });
  }

  public upsertProfile(ctx: RequestContext, dto: UpsertProfileDto) {
    return this.db.withContext(ctx, async (client) => {
      const upserted = await client.query<{ id: string }>(
        `INSERT INTO professional.profiles(person_id, professional_type, summary)
         VALUES ($1,$2,$3)
         ON CONFLICT (person_id) DO UPDATE SET professional_type = EXCLUDED.professional_type, summary = EXCLUDED.summary
         RETURNING id`,
        [ctx.personId, dto.professionalType, dto.summary ?? null],
      );
      const id = upserted.rows[0]!.id;
      await this.ledger.append(client, ctx, { entityType: "PROFESSIONAL_PROFILE", entityId: id, actionType: "UPSERT", payload: dto });
      return { id };
    });
  }

  public addCiv(ctx: RequestContext, dto: CreateCivDto) {
    return this.withProfile(ctx, async (client, profileId) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO professional.civ_records(profile_id, civ_number, hours_total, issued_at)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [profileId, dto.civNumber, dto.hoursTotal, dto.issuedAt ?? null],
      );
      const id = inserted.rows[0]!.id;
      await this.ledger.append(client, ctx, { entityType: "CIV", entityId: id, actionType: "INSERT", payload: dto });
      return { id };
    });
  }

  public addCma(ctx: RequestContext, dto: CreateCmaDto) {
    return this.withProfile(ctx, async (client, profileId) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO professional.cma_records(profile_id, cma_class, valid_until, clinic_name)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [profileId, dto.cmaClass, dto.validUntil, dto.clinicName ?? null],
      );
      const id = inserted.rows[0]!.id;
      await this.ledger.append(client, ctx, { entityType: "CMA", entityId: id, actionType: "INSERT", payload: dto });
      return { id };
    });
  }

  public addExperience(ctx: RequestContext, dto: CreateExperienceDto) {
    return this.withProfile(ctx, async (client, profileId) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO professional.experiences(profile_id, company_name, role_title, started_at, ended_at, description)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [profileId, dto.companyName, dto.roleTitle, dto.startedAt, dto.endedAt ?? null, dto.description ?? null],
      );
      return { id: inserted.rows[0]!.id };
    });
  }

  private withProfile<T>(
    ctx: RequestContext,
    fn: (client: import("../../platform/database/database.service.ts").SqlClient, profileId: string) => Promise<T>,
  ) {
    return this.db.withContext(ctx, async (client) => {
      const profile = await client.query<{ id: string }>("SELECT id FROM professional.profiles WHERE person_id = $1", [ctx.personId]);
      if (!profile.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Crie o perfil profissional primeiro." });
      return fn(client, profile.rows[0].id);
    });
  }
}
