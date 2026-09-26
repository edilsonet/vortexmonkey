import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ProtocolRecord, RequestContext } from '@vortex/shared-dto';
import { DatabaseService, type SqlClient } from '../database/database.service';

interface ProtocolRow {
  id: string;
  protocol_number: string;
  protocol_year: number;
  sequence_number: number;
  tenant_id: string;
  company_id: string | null;
  entity_type: string;
  entity_id: string;
  ledger_block_id: string | null;
  created_at: Date;
}

export interface ProtocolTarget {
  readonly entityType: string;
  readonly entityId: string;
  /** Ano de competencia; padrao: ano corrente (UTC). */
  readonly year?: number;
  /** Bloco do ledger da mesma transacao, gravado direto (evita UPDATE). */
  readonly ledgerBlockId?: string;
}

/** Monta o numero no formato `AAAA-NNNNNN` (Resolucao ANAC 520/2019). */
export function formatProtocolNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`Ano invalido para protocolo: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new Error(`Sequencia invalida para protocolo: ${sequence}`);
  }
  return `${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Protocolo eletronico. Emite o numero e grava o registro usando o MESMO cliente
 * transacional do dominio (`SqlClient`), como o ledger: o protocolo so existe se
 * a escrita existir (regra 1 do contrato).
 */
@Injectable()
export class ProtocolService {
  public constructor(private readonly database: DatabaseService) {}

  /** Le um protocolo sob RLS: so o tenant/empresa do vinculo ve o registro. */
  public find(context: RequestContext, protocolNumber: string): Promise<ProtocolRecord> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<ProtocolRow>(
        `SELECT id, protocol_number, protocol_year, sequence_number, tenant_id, company_id,
                entity_type, entity_id, ledger_block_id, created_at
           FROM protocol.protocols WHERE protocol_number = $1`,
        [protocolNumber],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Protocolo ${protocolNumber} nao encontrado.`,
        });
      }
      return {
        id: row.id,
        protocolNumber: row.protocol_number,
        protocolYear: row.protocol_year,
        sequenceNumber: row.sequence_number,
        tenantId: row.tenant_id,
        companyId: row.company_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        ledgerBlockId: row.ledger_block_id,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  public async issue(
    client: SqlClient,
    context: RequestContext,
    target: ProtocolTarget,
  ): Promise<{ readonly protocolNumber: string; readonly protocolId: string }> {
    const year = target.year ?? new Date().getUTCFullYear();
    const counter = await client.query<{ next_number: number }>(
      'SELECT protocol.next_number($1) AS next_number',
      [year],
    );
    const sequence = counter.rows[0]?.next_number;
    if (sequence === undefined) throw new Error('Falha ao gerar o numero de protocolo.');

    const protocolNumber = formatProtocolNumber(year, sequence);
    const id = randomUUID();
    await client.query(
      `INSERT INTO protocol.protocols(
         id, protocol_number, protocol_year, sequence_number,
         tenant_id, company_id, entity_type, entity_id, created_by, ledger_block_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        protocolNumber,
        year,
        sequence,
        context.tenantId,
        context.companyId ?? null,
        target.entityType,
        target.entityId,
        context.userId,
        target.ledgerBlockId ?? null,
      ],
    );
    return { protocolNumber, protocolId: id };
  }
}
