import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { RequestContext } from '@vortex/types';
import { stableStringify } from '@vortex/utils';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type { AuditQueryDto } from './audit.dto';

export interface RecordAuditInput {
  requestId: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  method: string;
  path: string;
  params: unknown;
  query: unknown;
  body: unknown;
  outcome: 'SUCCESS' | 'FAILURE';
  statusCode: number;
  response: unknown;
}

@Injectable()
export class AuditService {
  public constructor(private readonly database: DatabaseService, private readonly ledger: LedgerService) {}

  public record(context: RequestContext, input: RecordAuditInput): Promise<void> {
    return this.database.withContext(context, async (client) => {
      const auditId = crypto.randomUUID();
      const ledgerId = crypto.randomUUID();
      const entityId = firstUuid(input.params);
      const entityType = entityTypeFromPath(input.path);
      const values = { method: input.method, path: input.path, params: redact(input.params), query: redact(input.query), body: redact(input.body) };
      const responseHash = createHash('sha256').update(stableStringify(input.response)).digest('hex');
      const payload = { auditId, action: `${input.method} ${input.path}`, entityType, entityId, outcome: input.outcome, statusCode: input.statusCode, values, responseHash };
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'AUDIT_EVENT', entityId: auditId, actionType: input.outcome, payload });
      await client.query(
        `INSERT INTO ledger.audit_events(id,tenant_id,user_id,company_id,request_id,ip_address,user_agent,action,entity_type,entity_id,outcome,status_code,values,response_hash,ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6::inet,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15)`,
        [auditId, context.tenantId, context.userId, context.companyId ?? null, input.requestId, normalizeIp(input.ipAddress), input.userAgent ?? null, `${input.method} ${input.path}`, entityType, entityId, input.outcome, input.statusCode, JSON.stringify(values), responseHash, ledgerId],
      );
    });
  }

  public search(context: RequestContext, query: AuditQueryDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => (await client.query(
      `SELECT id,tenant_id,user_id,company_id,request_id,ip_address,user_agent,action,entity_type,entity_id,outcome,status_code,values,response_hash,ledger_block_id,occurred_at
       FROM ledger.audit_events
       WHERE tenant_id=$1
         AND ($2::uuid IS NULL OR user_id=$2)
         AND ($3::uuid IS NULL OR entity_id=$3)
         AND ($4::timestamptz IS NULL OR occurred_at >= $4)
         AND ($5::timestamptz IS NULL OR occurred_at <= $5)
       ORDER BY occurred_at DESC LIMIT $6`,
      [context.tenantId, query.userId ?? null, query.entityId ?? null, query.from ?? null, query.to ?? null, query.limit ?? 100],
    )).rows);
  }
}

const firstUuid = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null) return null;
  for (const candidate of Object.values(value)) if (typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) return candidate;
  return null;
};

const entityTypeFromPath = (path: string): string => path.split('?')[0]!.split('/').filter(Boolean).slice(2, 3)[0]?.replaceAll('-', '_').toUpperCase() ?? 'HTTP_REQUEST';
const normalizeIp = (value?: string): string | null => value ? value.replace(/^::ffff:/, '') : null;
const sensitiveKeys = new Set(['password', 'refreshtoken', 'accesstoken', 'authorization', 'cookie', 'secret', 'signature']);
const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : redact(item)]));
};
