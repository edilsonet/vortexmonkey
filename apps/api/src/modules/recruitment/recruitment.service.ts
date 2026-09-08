import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { BillingService } from "../billing/billing.service.ts";
import type { ApplyDto, CreateVacancyDto, HireDto } from "./recruitment.dto.ts";

@Injectable()
export class RecruitmentService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(BillingService) private readonly billing: BillingService,
  ) {}

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT v.*, c.corporate_name,
                (SELECT count(*)::int FROM recruitment.applications a WHERE a.vacancy_id = v.id) AS applications,
                (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'person_id', a.person_id, 'status', a.status)), '[]'::jsonb)
                 FROM recruitment.applications a WHERE a.vacancy_id = v.id) AS application_rows
         FROM recruitment.vacancies v
         JOIN identity.companies c ON c.id = v.company_id
         WHERE v.tenant_id = $1
         ORDER BY v.created_at DESC`,
        [ctx.tenantId],
      );
      return result.rows;
    });
  }

  public create(ctx: RequestContext, dto: CreateVacancyDto) {
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO recruitment.vacancies(tenant_id, company_id, title, source_app, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.title, dto.sourceApp ?? "RCONTA", ctx.personId],
      );
      const id = inserted.rows[0]!.id;
      await this.ledger.append(client, ctx, { entityType: "VACANCY", entityId: id, actionType: "INSERT", payload: dto });
      return { id };
    });
  }

  public apply(ctx: RequestContext, dto: ApplyDto) {
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO recruitment.applications(vacancy_id, person_id) VALUES ($1,$2)
         ON CONFLICT (vacancy_id, person_id) DO UPDATE SET status = recruitment.applications.status
         RETURNING id`,
        [dto.vacancyId, ctx.personId],
      );
      return { id: inserted.rows[0]!.id };
    });
  }

  public async hire(ctx: RequestContext, dto: HireDto) {
    const hired = await this.db.withContext(ctx, async (client) => {
      const row = await client.query<{ id: string; vacancy_id: string }>(
        `SELECT id, vacancy_id FROM recruitment.applications WHERE id = $1`,
        [dto.applicationId],
      );
      const app = row.rows[0];
      if (!app) throw new NotFoundException({ code: "NOT_FOUND", message: "Candidatura nao encontrada." });
      await client.query(`UPDATE recruitment.applications SET status = 'HIRED' WHERE id = $1`, [app.id]);
      await this.ledger.append(client, ctx, {
        entityType: "APPLICATION",
        entityId: app.id,
        actionType: "HIRE",
        payload: { vacancyId: app.vacancy_id, salaryBrl: dto.salaryBrl },
      });
      return app;
    });
    const commission = await this.billing.recordCommission(ctx, {
      source: "RECRUITMENT_HIRE",
      sourceId: hired.id,
      grossBrl: dto.salaryBrl,
    });
    return { applicationId: hired.id, commission };
  }
}
