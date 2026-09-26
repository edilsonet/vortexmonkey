import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, createPublicKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { RequestContext } from '@vortex/types';
import { DatabaseService, type SqlClient } from '../../platform/database/database.service';
import { canonicalLedgerBlock, createMerkleProof, reconstructEntity, verifyLedgerRows, type LedgerRow, type LedgerVerification } from './ledger.integrity';

export interface AppendLedgerInput {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  payload: unknown;
  changes?: unknown;
}

@Injectable()
export class LedgerService {
  public constructor(private readonly database: DatabaseService) {}

  private readonly privateKey = (() => {
    const path = process.env.LEDGER_PRIVATE_KEY_FILE;
    if (path) return readFileSync(path, 'utf8');
    if (process.env.NODE_ENV === 'production') throw new Error('LEDGER_PRIVATE_KEY_FILE é obrigatório em produção.');
    return generateKeyPairSync('ed25519').privateKey;
  })();

  private readonly publicKey = createPublicKey(
    process.env.LEDGER_PUBLIC_KEY_FILE ? readFileSync(process.env.LEDGER_PUBLIC_KEY_FILE, 'utf8') : this.privateKey,
  );

  public async append(client: SqlClient, context: RequestContext, input: AppendLedgerInput): Promise<string> {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [context.tenantId]);
    await client.query(`INSERT INTO ledger.chain_heads(tenant_id,last_hash,last_position) VALUES ($1,$2,0) ON CONFLICT (tenant_id) DO NOTHING`, [context.tenantId, '0'.repeat(64)]);
    const head = await client.query<{ last_hash: string; last_position: string }>('SELECT last_hash,last_position FROM ledger.chain_heads WHERE tenant_id=$1 FOR UPDATE', [context.tenantId]);
    const previousHash = head.rows[0]?.last_hash ?? '0'.repeat(64);
    const chainPosition = Number(head.rows[0]?.last_position ?? 0) + 1;
    const hash = createHash('sha256').update(canonicalLedgerBlock(previousHash, input.entityType, input.entityId, input.actionType, input.payload)).digest('hex');
    const signature = sign(null, Buffer.from(hash, 'hex'), this.privateKey).toString('base64');
    await client.query(
      `INSERT INTO ledger.ledger_blocks(id, previous_hash, hash, timestamp, tenant_id, user_id, company_id, entity_type, entity_id, action_type, payload, changes, created_by, signature, chain_position)
       VALUES ($1,$2,$3,clock_timestamp(),$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$5,$12,$13)`,
      [input.id, previousHash, hash, context.tenantId, context.userId, context.companyId ?? null, input.entityType, input.entityId, input.actionType, JSON.stringify(input.payload), JSON.stringify(input.changes ?? null), signature, chainPosition],
    );
    await client.query('UPDATE ledger.chain_heads SET last_hash=$2,last_position=$3,updated_at=clock_timestamp() WHERE tenant_id=$1', [context.tenantId, hash, chainPosition]);
    return hash;
  }

  public appendInternal(context: RequestContext, input: Omit<AppendLedgerInput, 'id'>): Promise<{ id: string; hash: string }> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => ({ id, hash: await this.append(client, context, { ...input, id }) }));
  }

  public getEntity(context: RequestContext, entityId: string): Promise<LedgerRow[]> {
    return this.database.withContext(context, async (client) => (await client.query<LedgerRow>(
      `SELECT id,version,previous_hash,hash,timestamp,tenant_id,user_id,company_id,entity_type,entity_id,action_type,payload,changes,created_by,signature
       FROM ledger.ledger_blocks WHERE tenant_id=$1 AND entity_id=$2 ORDER BY timestamp,id`,
      [context.tenantId, entityId],
    )).rows);
  }

  public async getDiff(context: RequestContext, entityId: string): Promise<{ entityId: string; events: LedgerRow[]; currentState: Record<string, unknown> }> {
    const events = await this.getEntity(context, entityId);
    if (!events.length) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Entidade não encontrada no ledger.' });
    return { entityId, events, currentState: reconstructEntity(events) };
  }

  public verifyChain(context: RequestContext): Promise<LedgerVerification> {
    return this.database.withContext(context, async (client) => verifyLedgerRows((await client.query<LedgerRow>(
      `SELECT id,version,previous_hash,hash,timestamp,tenant_id,user_id,company_id,entity_type,entity_id,action_type,payload,changes,created_by,signature
       FROM ledger.ledger_blocks WHERE tenant_id=$1 ORDER BY timestamp,id`,
      [context.tenantId],
    )).rows, this.publicKey));
  }

  public async verifyAndPersist(context: RequestContext, triggeredBy: 'API' | 'SCHEDULED'): Promise<LedgerVerification & { verificationId: string }> {
    const startedAt = new Date();
    const verification = await this.verifyChain(context);
    return this.database.withContext(context, async (client) => {
      const verificationId = randomUUID();
      const ledgerId = randomUUID();
      const payload = { ...verification, startedAt: startedAt.toISOString(), triggeredBy };
      await client.query(
        `INSERT INTO ledger.verification_runs(id,tenant_id,user_id,started_at,status,total_blocks,first_broken_block,last_hash,issues,ledger_block_id,triggered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
        [verificationId, context.tenantId, context.userId, startedAt, verification.status, verification.totalBlocks, verification.firstBrokenBlock, verification.lastHash, JSON.stringify(verification.issues), ledgerId, triggeredBy],
      );
      await this.append(client, context, { id: ledgerId, entityType: 'LEDGER_VERIFICATION', entityId: verificationId, actionType: 'VERIFICATION', payload });
      return { ...verification, verificationId };
    });
  }

  public exportMerkleProof(context: RequestContext): Promise<{
    tenantId: string; generatedAt: string; hashAlgorithm: 'SHA-256'; signatureAlgorithm: 'Ed25519'; blockCount: number;
    rootHash: string; rootSignature: string; publicKeyPem: string;
    leaves: Array<{ blockId: string; hash: string; proof: Array<{ position: 'LEFT' | 'RIGHT'; hash: string }> }>;
  }> {
    return this.database.withContext(context, async (client) => {
      const rows = (await client.query<{ id: string; hash: string }>(
        'SELECT id,hash FROM ledger.ledger_blocks WHERE tenant_id=$1 ORDER BY timestamp,id',
        [context.tenantId],
      )).rows;
      const merkle = createMerkleProof(rows);
      return {
        tenantId: context.tenantId, generatedAt: new Date().toISOString(), hashAlgorithm: 'SHA-256', signatureAlgorithm: 'Ed25519',
        blockCount: rows.length, rootHash: merkle.rootHash,
        rootSignature: sign(null, Buffer.from(merkle.rootHash, 'hex'), this.privateKey).toString('base64'),
        publicKeyPem: this.publicKey.export({ type: 'spki', format: 'pem' }).toString(), leaves: merkle.leaves,
      };
    });
  }
}

export { canonicalLedgerBlock, createMerkleProof, reconstructEntity, verifyLedgerRows, type LedgerRow, type LedgerVerification } from './ledger.integrity';
