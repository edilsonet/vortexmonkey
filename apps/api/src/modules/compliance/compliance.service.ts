import { Inject, Injectable } from "@nestjs/common";
import { maskPersonalData } from "@vortex/utils";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import type { LgpdRequestDto } from "./compliance.dto.ts";

@Injectable()
export class ComplianceService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, request_type, status, created_at FROM compliance.lgpd_requests ORDER BY created_at DESC LIMIT 50`,
      );
      return result.rows;
    });
  }

  public submit(ctx: RequestContext, dto: LgpdRequestDto) {
    return this.db.withContext(ctx, async (client) => {
      let payload: Record<string, unknown> = { notes: dto.notes ?? null };
      if (dto.requestType === "EXPORT") {
        const person = await client.query(
          "SELECT id, full_name, email, phone, cpf, canac FROM identity.people WHERE id = $1",
          [ctx.personId],
        );
        const docs = await client.query(
          "SELECT id, name, document_type, created_at FROM documents.documents WHERE created_by = $1",
          [ctx.personId],
        );
        payload = { person: person.rows[0] ?? null, documents: docs.rows };
      }
      if (dto.requestType === "ERASURE") {
        await client.query(
          `UPDATE identity.people SET full_name = 'TITULAR ANONIMIZADO', social_name = NULL, phone = NULL, canac = NULL
           WHERE id = $1`,
          [ctx.personId],
        );
        payload = { erased: true, retained: ["cpf", "email", "ledger"] };
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO compliance.lgpd_requests(tenant_id, person_id, request_type, status, payload)
         VALUES ($1,$2,$3,'DONE',$4::jsonb) RETURNING id`,
        [ctx.tenantId, ctx.personId, dto.requestType, JSON.stringify(payload)],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "LGPD", entityId: id, actionType: `LGPD_${dto.requestType}`, payload: { requestType: dto.requestType },
      });
      await client.query("UPDATE compliance.lgpd_requests SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `LGPD ${dto.requestType}`,
        entityType: "LGPD",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number, payload };
    });
  }

  public previewMask(value: string) {
    return { masked: maskPersonalData(value) };
  }
}
