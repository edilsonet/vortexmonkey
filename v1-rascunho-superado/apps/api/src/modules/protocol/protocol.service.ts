import { Inject, Injectable } from "@nestjs/common";
import { formatProtocol } from "@vortex/utils";
import type { RequestContext } from "@vortex/types";
import type { SqlClient } from "../../platform/database/database.service.ts";
import { DatabaseService } from "../../platform/database/database.service.ts";

@Injectable()
export class ProtocolService {
  public constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public async issue(
    client: SqlClient,
    ctx: RequestContext,
    input: { subject: string; entityType: string; entityId: string; ledgerBlockId: string },
  ): Promise<{ id: string; number: string }> {
    const year = new Date().getUTCFullYear();
    await client.query(
      `INSERT INTO protocol.sequences(year, last_seq) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_seq = protocol.sequences.last_seq + 1`,
      [year],
    );
    const seq = await client.query<{ last_seq: number }>("SELECT last_seq FROM protocol.sequences WHERE year = $1", [year]);
    const number = formatProtocol(year, seq.rows[0]!.last_seq);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO protocol.protocols(number, tenant_id, actor_person_id, company_id, subject, entity_type, entity_id, ledger_block_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [number, ctx.tenantId, ctx.personId, ctx.companyId, input.subject, input.entityType, input.entityId, input.ledgerBlockId],
    );
    const id = inserted.rows[0]!.id;
    await client.query(
      `INSERT INTO protocol.timeline_events(protocol_id, event_type, notes) VALUES ($1,'CREATED',$2)`,
      [id, input.subject],
    );
    return { id, number };
  }

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, number, subject, entity_type, status, created_at
         FROM protocol.protocols ORDER BY created_at DESC LIMIT 100`,
      );
      return result.rows;
    });
  }
}
