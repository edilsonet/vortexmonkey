import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { createHash, generateKeyPairSync, sign as edSign, verify as edVerify } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RequestContext } from "@vortex/types";
import type { SqlClient } from "../../platform/database/database.service.ts";
import { DatabaseService } from "../../platform/database/database.service.ts";

interface AppendInput {
  entityType: string;
  entityId: string;
  actionType: string;
  payload: unknown;
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`;
};

const keys = (() => {
  if (process.env.LEDGER_PRIVATE_KEY && process.env.LEDGER_PUBLIC_KEY) {
    return { privateKey: process.env.LEDGER_PRIVATE_KEY, publicKey: process.env.LEDGER_PUBLIC_KEY };
  }
  const dir = path.join(process.cwd(), ".secrets");
  const privPath = path.join(dir, "ledger-ed25519.pem");
  const pubPath = path.join(dir, "ledger-ed25519.pub.pem");
  try {
    return { privateKey: readFileSync(privPath, "utf8"), publicKey: readFileSync(pubPath, "utf8") };
  } catch {
    const pair = generateKeyPairSync("ed25519");
    const privateKey = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKey = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    mkdirSync(dir, { recursive: true });
    writeFileSync(privPath, privateKey, { mode: 0o600 });
    writeFileSync(pubPath, publicKey, { mode: 0o600 });
    return { privateKey, publicKey };
  }
})();

@Injectable()
export class LedgerService {
  public constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public async append(client: SqlClient, ctx: RequestContext, input: AppendInput): Promise<{ id: string; hash: string; number?: string }> {
    const head = await client.query<{ last_hash: string | null; last_seq: string }>(
      "SELECT last_hash, last_seq FROM ledger.chain_heads WHERE id = 1 FOR UPDATE",
    );
    const prevHash = head.rows[0]?.last_hash ?? null;
    const payload = stableStringify(input.payload ?? {});
    const material = `${prevHash ?? "GENESIS"}|${input.entityType}|${input.entityId}|${input.actionType}|${payload}`;
    const hash = createHash("sha256").update(material).digest("hex");
    const signature = edSign(null, Buffer.from(hash), keys.privateKey).toString("hex");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO ledger.ledger_blocks(
         tenant_id, actor_person_id, company_id, entity_type, entity_id, action_type, payload, prev_hash, hash, signature
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING id`,
      [
        ctx.tenantId, ctx.personId, ctx.companyId, input.entityType, input.entityId, input.actionType, payload, prevHash, hash, signature,
      ],
    );
    const id = inserted.rows[0]!.id;
    await client.query(
      `UPDATE ledger.chain_heads SET last_block_id = $1, last_hash = $2, last_seq = last_seq + 1 WHERE id = 1`,
      [id, hash],
    );
    await client.query(
      `INSERT INTO ledger.outbox_events(tenant_id, actor_person_id, company_id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [ctx.tenantId, ctx.personId, ctx.companyId, input.entityType, input.entityId, input.actionType, payload],
    );
    return { id, hash };
  }

  public async verify(): Promise<{ valid: boolean; checked: number; issues: string[] }> {
    const blocks = await this.db.query<{
      seq: string; hash: string; prev_hash: string | null; signature: string; entity_type: string; entity_id: string; action_type: string; payload: unknown;
    }>("SELECT seq, hash, prev_hash, signature, entity_type, entity_id, action_type, payload FROM ledger.ledger_blocks ORDER BY seq ASC");
    const issues: string[] = [];
    let prev: string | null = null;
    for (const block of blocks.rows) {
      const material: string = `${prev ?? "GENESIS"}|${block.entity_type}|${block.entity_id}|${block.action_type}|${stableStringify(block.payload)}`;
      const expected: string = createHash("sha256").update(material).digest("hex");
      if (expected !== block.hash) issues.push(`hash mismatch seq=${block.seq}`);
      if ((prev ?? null) !== (block.prev_hash ?? null)) issues.push(`chain break seq=${block.seq}`);
      const ok = edVerify(null, Buffer.from(block.hash), keys.publicKey, Buffer.from(block.signature, "hex"));
      if (!ok) issues.push(`signature invalid seq=${block.seq}`);
      prev = block.hash;
    }
    if (issues.length) {
      throw new InternalServerErrorException({ code: "LEDGER_VERIFICATION_FAILED", message: "Cadeia do ledger comprometida.", details: issues });
    }
    return { valid: true, checked: blocks.rowCount ?? 0, issues: [] };
  }

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, seq, entity_type, entity_id, action_type, hash, created_at
         FROM ledger.ledger_blocks ORDER BY seq DESC LIMIT 100`,
      );
      return result.rows;
    });
  }
}
