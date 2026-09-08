import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { badgeSummary, fingerprint, type AlertSeverity } from "./alerts.policy.ts";
import { TOX_VALIDITY_DAYS } from "../ppsp/ppsp.policy.ts";

@Injectable()
export class AlertsService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  public async list(ctx: RequestContext) {
    await this.refresh(ctx);
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, severity, source, title, body, entity_type, entity_id, status, created_at
         FROM notifications.alerts
         WHERE person_id = $1 OR tenant_id = $2
         ORDER BY
           CASE severity WHEN 'BLOCKING' THEN 4 WHEN 'CRITICAL' THEN 3 WHEN 'WARNING' THEN 2 ELSE 1 END DESC,
           created_at DESC
         LIMIT 100`,
        [ctx.personId, ctx.tenantId],
      );
      return result.rows;
    });
  }

  public async badges(ctx: RequestContext) {
    const rows = await this.list(ctx);
    const open = rows.filter((r) => r.status === "OPEN") as { severity: AlertSeverity; status: string }[];
    return {
      total: open.length,
      badges: badgeSummary(open),
    };
  }

  public ack(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const updated = await client.query(
        `UPDATE notifications.alerts SET status = 'ACK'
         WHERE id = $1 AND (person_id = $2 OR tenant_id = $3) AND status = 'OPEN'
         RETURNING id`,
        [id, ctx.personId, ctx.tenantId],
      );
      if (!updated.rowCount) throw new NotFoundException({ code: "NOT_FOUND", message: "Alerta nao encontrado." });
      return { id, status: "ACK" };
    });
  }

  public refresh(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const pending = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM identity.relationships WHERE tenant_id = $1 AND status = 'PENDING'`,
        [ctx.tenantId],
      );
      const pendingN = pending.rows[0]?.n ?? 0;
      if (pendingN > 0) {
        await this.upsert(client, ctx, {
          severity: "INFO",
          source: "IDENTITY",
          title: "Vinculos pendentes de dupla confirmacao",
          body: `${pendingN} vinculo(s) aguardando confirmacao.`,
          entityType: "RELATIONSHIP",
          entityId: ctx.tenantId ?? ctx.personId,
        });
      }

      const tox = await client.query<{ person_id: string; valid_until: string; full_name: string }>(
        `SELECT DISTINCT ON (e.person_id) e.person_id, e.valid_until::text, p.full_name
         FROM compliance.ppsp_exams e
         JOIN identity.people p ON p.id = e.person_id
         WHERE e.tenant_id = $1
         ORDER BY e.person_id, e.collected_at DESC`,
        [ctx.tenantId],
      );
      const now = Date.now();
      const warnMs = 14 * 24 * 60 * 60 * 1000;
      for (const row of tox.rows) {
        const until = new Date(`${row.valid_until}T00:00:00Z`).getTime();
        if (until < now) {
          await this.upsert(client, ctx, {
            severity: "CRITICAL",
            source: "PPSP",
            title: `Toxicologico vencido · ${row.full_name}`,
            body: `Validade de ${TOX_VALIDITY_DAYS} dias expirada em ${row.valid_until}.`,
            entityType: "PPSP_EXAM",
            entityId: row.person_id,
          });
        } else if (until - now <= warnMs) {
          await this.upsert(client, ctx, {
            severity: "WARNING",
            source: "PPSP",
            title: `Toxicologico vencendo · ${row.full_name}`,
            body: `Vence em ${row.valid_until}.`,
            entityType: "PPSP_EXAM",
            entityId: row.person_id,
          });
        }
      }

      const coverage = await client.query<{ company_id: string; year: number; corporate_name: string; coverage: string | null }>(
        `SELECT p.company_id, p.year, c.corporate_name,
                (SELECT d.coverage::text FROM compliance.ppsp_draws d WHERE d.program_id = p.id ORDER BY d.created_at DESC LIMIT 1) AS coverage
         FROM compliance.ppsp_programs p
         JOIN identity.companies c ON c.id = p.company_id
         WHERE p.tenant_id = $1 AND p.status = 'ACTIVE'`,
        [ctx.tenantId],
      );
      for (const row of coverage.rows) {
        const cov = row.coverage == null ? 0 : Number(row.coverage);
        if (cov < 0.25) {
          await this.upsert(client, ctx, {
            severity: "BLOCKING",
            source: "PPSP",
            title: `Cobertura PPSP abaixo de 25% · ${row.corporate_name}`,
            body: `Ano ${row.year}. RBAC 120 exige sorteio anual >= 25%.`,
            entityType: "PPSP",
            entityId: row.company_id,
          });
        }
      }
      return { ok: true };
    });
  }

  private async upsert(
    client: import("../../platform/database/database.service.ts").SqlClient,
    ctx: RequestContext,
    input: {
      severity: AlertSeverity;
      source: string;
      title: string;
      body: string;
      entityType: string;
      entityId: string;
    },
  ): Promise<void> {
    const fp = fingerprint(input.source, input.entityType, input.entityId, input.title);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO notifications.alerts(
         tenant_id, person_id, company_id, severity, source, title, body, entity_type, entity_id, fingerprint
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (tenant_id, fingerprint) DO NOTHING
       RETURNING id`,
      [
        ctx.tenantId,
        ctx.personId,
        ctx.companyId,
        input.severity,
        input.source,
        input.title,
        input.body,
        input.entityType,
        input.entityId,
        fp,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      await client.query(
        `UPDATE notifications.alerts SET severity = $1, body = $2
         WHERE tenant_id = $3 AND fingerprint = $4 AND status = 'OPEN'`,
        [input.severity, input.body, ctx.tenantId, fp],
      );
      return;
    }
    const block = await this.ledger.append(client, ctx, {
      entityType: "ALERT",
      entityId: id,
      actionType: "UPSERT",
      payload: { severity: input.severity, source: input.source, title: input.title },
    });
    await client.query("UPDATE notifications.alerts SET ledger_block_id = $2 WHERE id = $1 AND ledger_block_id IS NULL", [
      id,
      block.id,
    ]);
  }
}
