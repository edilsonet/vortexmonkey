import { Inject, Injectable } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { evaluateRule } from "./bre.policy.ts";
import type { EvaluateRuleDto } from "./bre.dto.ts";

@Injectable()
export class BreService {
  public constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public rules(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const rows = await client.query(
        "SELECT code, severity, module, message, active FROM compliance.bre_rules ORDER BY module, code",
      );
      return rows.rows;
    });
  }

  public evaluate(_ctx: RequestContext, dto: EvaluateRuleDto) {
    return evaluateRule(dto.code, dto.context ?? {});
  }
}
