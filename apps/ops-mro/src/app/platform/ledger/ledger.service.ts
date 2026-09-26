import { Injectable } from '@nestjs/common';
import type { LedgerVerification, RequestContext } from '@vortex/shared-dto';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseService, type SqlClient } from '../database/database.service';
import { GENESIS_HASH, blockHash } from './ledger.integrity';

export interface AppendLedgerInput {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly actionType: string;
  readonly payload: unknown;
  readonly changes?: unknown;
}

interface LedgerBlockRow {
  id: string;
  chain_position: string | null;
  previous_hash: string;
  hash: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  payload: unknown;
  signature: string;
}

/**
 * Ledger append-only (Resolucao ANAC 458/2017).
 *
 * Cada bloco carrega SHA-256 encadeado ao hash anterior do mesmo tenant, mais
 * assinatura Ed25519 (Lei 14.063/2020). A tabela tem trigger que proibe UPDATE
 * e DELETE. O `pg_advisory_xact_lock` por tenant serializa a escrita, e
 * `chain_heads ... FOR UPDATE` garante posicao e hash anteriores corretos.
 */
@Injectable()
export class LedgerService {
  public constructor(private readonly database: DatabaseService) {}

  private readonly privateKey: KeyObject = (() => {
    const path = process.env.LEDGER_PRIVATE_KEY_FILE;
    if (path) return createPrivateKey(readFileSync(path, 'utf8'));
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LEDGER_PRIVATE_KEY_FILE e obrigatorio em producao.');
    }
    return this.devKey();
  })();

  /**
   * Chave de desenvolvimento persistida em `.data/` (fora do git). Sem isso a
   * cadeia gravada em uma execucao nao seria verificavel na seguinte, porque a
   * chave mudaria a cada boot.
   */
  private devKey(): KeyObject {
    const file = resolve(process.cwd(), '.data', 'ledger-ed25519.pem');
    if (existsSync(file)) return createPrivateKey(readFileSync(file, 'utf8'));
    const { privateKey } = generateKeyPairSync('ed25519');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    return privateKey;
  }

  private readonly publicKey = createPublicKey(
    process.env.LEDGER_PUBLIC_KEY_FILE
      ? readFileSync(process.env.LEDGER_PUBLIC_KEY_FILE, 'utf8')
      : this.privateKey,
  );

  /** Anexa um bloco usando um cliente ja dentro da transacao de dominio. */
  public async append(
    client: SqlClient,
    context: RequestContext,
    input: AppendLedgerInput,
  ): Promise<string> {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      context.tenantId,
    ]);
    await client.query(
      `INSERT INTO ledger.chain_heads(tenant_id, last_hash, last_position)
       VALUES ($1, $2, 0) ON CONFLICT (tenant_id) DO NOTHING`,
      [context.tenantId, GENESIS_HASH],
    );
    const head = await client.query<{ last_hash: string; last_position: string }>(
      'SELECT last_hash, last_position FROM ledger.chain_heads WHERE tenant_id = $1 FOR UPDATE',
      [context.tenantId],
    );
    const previousHash = head.rows[0]?.last_hash ?? GENESIS_HASH;
    const chainPosition = Number(head.rows[0]?.last_position ?? 0) + 1;
    const hash = blockHash(
      previousHash,
      input.entityType,
      input.entityId,
      input.actionType,
      input.payload,
    );
    const signature = sign(null, Buffer.from(hash, 'hex'), this.privateKey).toString('base64');

    await client.query(
      `INSERT INTO ledger.ledger_blocks(
         id, previous_hash, hash, tenant_id, user_id, company_id,
         entity_type, entity_id, action_type, payload, changes, created_by, signature, chain_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $5, $12, $13)`,
      [
        input.id,
        previousHash,
        hash,
        context.tenantId,
        context.userId,
        context.companyId ?? null,
        input.entityType,
        input.entityId,
        input.actionType,
        JSON.stringify(input.payload),
        JSON.stringify(input.changes ?? null),
        signature,
        chainPosition,
      ],
    );
    await client.query(
      'UPDATE ledger.chain_heads SET last_hash = $2, last_position = $3, updated_at = clock_timestamp() WHERE tenant_id = $1',
      [context.tenantId, hash, chainPosition],
    );
    // Outbox transacional: o evento nasce junto com o bloco, na mesma transacao,
    // e sera publicado no bus por um consumidor (ainda nao implementado). Assim
    // nao existe bloco sem evento nem evento sem bloco.
    await client.query(
      `INSERT INTO ledger.outbox_events(
         tenant_id, user_id, company_id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        context.tenantId,
        context.userId,
        context.companyId ?? null,
        input.entityType,
        input.entityId,
        `${input.entityType}.${input.actionType}`,
        JSON.stringify({ ledgerBlockId: input.id, hash, payload: input.payload }),
      ],
    );
    return hash;
  }

  /** Anexa em transacao propria (uso fora de um fluxo de dominio). */
  public appendInternal(
    context: RequestContext,
    input: Omit<AppendLedgerInput, 'id'>,
  ): Promise<{ id: string; hash: string }> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => ({
      id,
      hash: await this.append(client, context, { ...input, id }),
    }));
  }

  public publicKeyPem(): string {
    return this.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }

  /**
   * Reconstroi e valida a cadeia do tenant: encadeamento (`previous_hash`),
   * SHA-256 recalculado do conteudo e assinatura Ed25519 de cada bloco. E o
   * teste que sustenta o "registro eletronico imutavel" da Resolucao 458/2017.
   */
  public verifyChain(context: RequestContext): Promise<LedgerVerification> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<LedgerBlockRow>(
        `SELECT id, chain_position, previous_hash, hash, entity_type, entity_id,
                action_type, payload, signature
           FROM ledger.ledger_blocks
          WHERE tenant_id = $1
          ORDER BY chain_position`,
        [context.tenantId],
      );

      let expectedPrevious = GENESIS_HASH;
      for (const row of result.rows) {
        const position = Number(row.chain_position ?? 0);
        const fail = (reason: string): LedgerVerification => ({
          valid: false,
          blocks: result.rows.length,
          tenantId: context.tenantId,
          failure: { blockId: row.id, position, reason },
        });
        if (row.previous_hash !== expectedPrevious) return fail('Encadeamento quebrado.');
        const recomputed = blockHash(
          row.previous_hash,
          row.entity_type,
          row.entity_id,
          row.action_type,
          row.payload,
        );
        if (recomputed !== row.hash) return fail('Hash do bloco nao corresponde ao conteudo.');
        const signatureOk = verify(
          null,
          Buffer.from(row.hash, 'hex'),
          this.publicKey,
          Buffer.from(row.signature, 'base64'),
        );
        if (!signatureOk) return fail('Assinatura Ed25519 invalida.');
        expectedPrevious = row.hash;
      }

      return {
        valid: true,
        blocks: result.rows.length,
        tenantId: context.tenantId,
        failure: null,
      };
    });
  }
}
