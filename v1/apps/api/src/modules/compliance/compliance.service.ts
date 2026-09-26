import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PHASE_3_COMPLIANCE_EVENTS } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { MinioService } from '../documents/minio.service';
import type { RequestExportDto, RequestErasureDto, RevokeConsentDto } from './compliance.dto';

interface LgpdRequestRow {
  id: string; tenant_id: string; user_id: string; request_type: string;
  status: string; justification: string | null; storage_key: string | null;
  result_summary: Record<string, unknown>; ledger_block_id: string;
  created_at: Date; completed_at: Date | null;
}

interface UserRow {
  id: string; name: string; email: string; cpf_hash: string | null;
  phone: string | null; document_number: string | null;
}

@Injectable()
export class ComplianceService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
    private readonly minio: MinioService,
  ) {}

  /**
   * POST /compliance/export — Portabilidade LGPD (art. 18, V).
   * Coleta todos os dados do titular, gera JSON portável e armazena no MinIO.
   * O arquivo fica disponível por 1 hora via presigned URL.
   */
  public requestExport(context: RequestContext, dto: RequestExportDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const requestId = randomUUID();
      const ledgerId = randomUUID();
      const storageKey = `compliance/exports/${context.tenantId}/${context.userId}/${requestId}.json`;

      // Cria o job de exportação em estado PROCESSING
      await client.query<LgpdRequestRow>(
        `INSERT INTO compliance.lgpd_requests
          (id, tenant_id, user_id, company_id, request_type, status, justification, storage_key, ledger_block_id)
         VALUES ($1,$2,$3,$4,'EXPORT','PROCESSING',$5,$6,$7)`,
        [requestId, context.tenantId, context.userId, context.companyId ?? null,
          dto.justification ?? null, storageKey, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LGPD_REQUEST', entityId: requestId,
        actionType: PHASE_3_COMPLIANCE_EVENTS.LGPD_EXPORT_REQUESTED,
        payload: { requestId, userId: context.userId, justification: dto.justification },
      });

      // Coleta dados do titular
      const exportData = await this.collectUserData(client, context);

      // Serializa e armazena
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        requestId,
        userId: context.userId,
        tenantId: context.tenantId,
        legalBasis: 'LGPD art. 18, V — Portabilidade dos dados',
        data: exportData,
      }, null, 2);

      await this.minio.putObject(storageKey, json, 'application/json');

      // Marca como COMPLETED
      const completedLedgerId = randomUUID();
      await client.query(
        `UPDATE compliance.lgpd_requests
         SET status = 'COMPLETED', completed_at = now(),
             result_summary = $2::jsonb
         WHERE id = $1`,
        [requestId, JSON.stringify({ exportedRecords: Object.keys(exportData).length })],
      );

      await this.ledger.append(client, context, {
        id: completedLedgerId, entityType: 'LGPD_REQUEST', entityId: requestId,
        actionType: PHASE_3_COMPLIANCE_EVENTS.LGPD_EXPORT_COMPLETED,
        payload: { requestId, storageKey },
      });

      const downloadUrl = await this.minio.presignedGetUrl(storageKey);
      return { requestId, status: 'COMPLETED', downloadUrl, expiresInSeconds: 3600 };
    });
  }

  /** GET /compliance/exports/:id — Estado + URL de download. */
  public getExport(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const req = (await client.query<LgpdRequestRow>(
        `SELECT * FROM compliance.lgpd_requests WHERE id = $1 AND request_type = 'EXPORT'`,
        [id],
      )).rows[0];
      if (!req) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Exportação não encontrada.' });

      const downloadUrl = req.storage_key && req.status === 'COMPLETED'
        ? await this.minio.presignedGetUrl(req.storage_key)
        : null;

      return { ...req, downloadUrl };
    });
  }

  /**
   * POST /compliance/erase — Esquecimento LGPD (art. 18, VI).
   * Anonimiza dados pessoais do titular SEM apagar o ledger (Regra 2 + RBAC 43.9).
   * Registros de manutenção (entidades NON_ERASABLE_ENTITY_TYPES) são PRESERVADOS.
   */
  public requestErasure(context: RequestContext, dto: RequestErasureDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const requestId = randomUUID();
      const ledgerId = randomUUID();

      await client.query<LgpdRequestRow>(
        `INSERT INTO compliance.lgpd_requests
          (id, tenant_id, user_id, company_id, request_type, status, justification, ledger_block_id)
         VALUES ($1,$2,$3,$4,'ERASURE','PROCESSING',$5,$6)`,
        [requestId, context.tenantId, context.userId, context.companyId ?? null,
          dto.justification, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'LGPD_REQUEST', entityId: requestId,
        actionType: PHASE_3_COMPLIANCE_EVENTS.LGPD_ERASURE_REQUESTED,
        payload: { requestId, userId: context.userId, justification: dto.justification },
      });

      // Anonimização: nome → hash prefixado, CPF/CNPJ → hash, phone → null
      const anonName = `[ANONIMIZADO-${createHash('sha256').update(context.userId).digest('hex').slice(0, 8)}]`;

      await client.query(
        `UPDATE identity.users
         SET name = $2,
             phone = NULL,
             document_number = NULL
         WHERE id = $1`,
        [context.userId, anonName],
      );

      // Também anonimiza documentos com dados pessoais do titular
      await client.query(
        `UPDATE documents.documents
         SET name = '[ANONIMIZADO]', contains_personal_data = false, classification = 'PRIVATE'
         WHERE created_by = $1
           AND tenant_id = $2
           AND contains_personal_data = true
           AND status <> 'ARCHIVED'`,
        [context.userId, context.tenantId],
      );

      // Completa a requisição
      const completedLedgerId = randomUUID();
      await client.query(
        `UPDATE compliance.lgpd_requests
         SET status = 'COMPLETED', completed_at = now(),
             result_summary = '{"anonymized": true, "ledgerPreserved": true}'::jsonb
         WHERE id = $1`,
        [requestId],
      );

      await this.ledger.append(client, context, {
        id: completedLedgerId, entityType: 'LGPD_REQUEST', entityId: requestId,
        actionType: PHASE_3_COMPLIANCE_EVENTS.LGPD_ERASURE_COMPLETED,
        payload: { requestId, anonymized: true, ledgerPreserved: true },
        changes: [{ field_path: 'identity.users.name', old_value: '[REDACTED]', new_value: anonName }],
      });

      return {
        requestId, status: 'COMPLETED',
        anonymized: true,
        ledgerPreserved: true,
        note: 'Dados pessoais anonimizados. Trilha do ledger e registros regulatórios preservados (RBAC 43.9/145.163).',
      };
    });
  }

  /** GET /compliance/erase/status — Estado das requisições de apagamento do usuário. */
  public getEraseStatus(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      return (await client.query<LgpdRequestRow>(
        `SELECT id, request_type, status, justification, created_at, completed_at, result_summary
         FROM compliance.lgpd_requests
         WHERE user_id = $1 AND tenant_id = $2 AND request_type = 'ERASURE'
         ORDER BY created_at DESC
         LIMIT 10`,
        [context.userId, context.tenantId],
      )).rows;
    });
  }

  /**
   * POST /compliance/consent/revoke — Revogação de consentimento (LGPD art. 8º, §5º).
   */
  public revokeConsent(context: RequestContext, dto: RevokeConsentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const eventId = randomUUID();
      const ledgerId = randomUUID();

      await client.query(
        `INSERT INTO compliance.consent_events
          (id, tenant_id, user_id, event_type, purpose, legal_basis, ledger_block_id)
         VALUES ($1,$2,$3,'CONSENT_REVOKED',$4,$5,$6)`,
        [eventId, context.tenantId, context.userId, dto.purpose, dto.legalBasis, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'CONSENT', entityId: eventId,
        actionType: PHASE_3_COMPLIANCE_EVENTS.CONSENT_REVOKED,
        payload: { purpose: dto.purpose, legalBasis: dto.legalBasis },
      });

      return { eventId, type: 'CONSENT_REVOKED', purpose: dto.purpose };
    });
  }

  // ─────────────────── Helpers ───────────────────

  private async collectUserData(
    client: { query: DatabaseService['query'] },
    context: RequestContext,
  ): Promise<Record<string, unknown>> {
    const [userRow, protocolRows, signatureRows, lgpdRows] = await Promise.all([
      client.query<UserRow>(
        'SELECT id, name, email FROM identity.users WHERE id = $1',
        [context.userId],
      ),
      client.query(
        `SELECT protocol_number, subject, entity_type, created_at FROM protocol.protocols
         WHERE created_by = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 100`,
        [context.userId, context.tenantId],
      ),
      client.query(
        `SELECT id, document_id, signature_level, method, timestamp_bsb FROM signatures.signatures
         WHERE signer_user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 100`,
        [context.userId, context.tenantId],
      ),
      client.query(
        `SELECT id, request_type, status, created_at FROM compliance.lgpd_requests
         WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 20`,
        [context.userId, context.tenantId],
      ),
    ]);

    return {
      identity: userRow.rows[0] ?? null,
      protocols: protocolRows.rows,
      signatures: signatureRows.rows,
      lgpdHistory: lgpdRows.rows,
    };
  }
}
