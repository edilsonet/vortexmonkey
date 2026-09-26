import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PHASE_3_DOCUMENT_EVENTS } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { MinioService } from './minio.service';
import type {
  AddVersionDto,
  GenerateSegvoo001Dto,
  InitiateUploadDto,
} from './documents.dto';

interface DocumentRow {
  id: string; tenant_id: string; name: string; mime_type: string; size_bytes: number;
  hash: string; storage_key: string; classification: string; contains_personal_data: boolean;
  status: string; document_type: string | null; protocol_id: string | null;
  owner_type: string | null; owner_id: string | null; created_by: string;
  company_id: string | null; ledger_block_id: string; created_at: Date;
}

interface VersionRow {
  id: string; document_id: string; version: number; hash: string;
  storage_key: string; size_bytes: number; change_note: string | null;
  created_by: string; ledger_block_id: string; created_at: Date;
}

@Injectable()
export class DocumentsService {

  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
    private readonly minio: MinioService,
  ) {}

  /**
   * POST /documents/upload — Fase 1: cria o registro e retorna presigned URL.
   * O cliente faz PUT direto no MinIO usando a URL.
   * Depois chama confirmUpload com o hash recalculado.
   */
  public async initiateUpload(context: RequestContext, dto: InitiateUploadDto): Promise<unknown> {
    // Regra LGPD: dado pessoal nunca pode ser PUBLIC
    if (dto.containsPersonalData && dto.classification === 'PUBLIC') {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Documento com dado pessoal não pode ser classificado como PUBLIC.',
      });
    }

    return this.database.withContext(context, async (client) => {
      const docId = randomUUID();
      const ledgerId = randomUUID();
      const storageKey = `${context.tenantId}/${docId}/${dto.name}`;

      const payload = {
        documentId: docId, name: dto.name, mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes, hash: dto.hash, classification: dto.classification,
        containsPersonalData: dto.containsPersonalData, documentType: dto.documentType,
      };

      await client.query<DocumentRow>(
        `INSERT INTO documents.documents
          (id, tenant_id, name, mime_type, size_bytes, hash, storage_key, classification,
           contains_personal_data, status, document_type, protocol_id, owner_type, owner_id,
           created_by, company_id, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'DRAFT',$10,$11,$12,$13,$14,$15,$16)`,
        [docId, context.tenantId, dto.name, dto.mimeType, dto.sizeBytes, dto.hash,
          storageKey, dto.classification, dto.containsPersonalData, dto.documentType ?? null,
          dto.protocolId ?? null, dto.ownerType ?? null, dto.ownerId ?? null,
          context.userId, context.companyId ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DOCUMENT', entityId: docId,
        actionType: PHASE_3_DOCUMENT_EVENTS.DOCUMENT_CREATED, payload,
      });

      // Gera presigned URL para upload direto
      const uploadUrl = await this.minio.presignedPutUrl(storageKey);

      return { documentId: docId, storageKey, uploadUrl, expiresInSeconds: 300 };
    });
  }

  /** GET /documents/:id */
  public getDocument(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const doc = (await client.query<DocumentRow>(
        'SELECT * FROM documents.documents WHERE id = $1',
        [id],
      )).rows[0];
      if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });

      // Gera presigned URL de leitura
      const downloadUrl = await this.minio.presignedGetUrl(doc.storage_key);
      return { ...doc, downloadUrl, downloadExpiresInSeconds: 300 };
    });
  }

  /** GET /documents/:id/versions */
  public getVersions(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      await this.requireDocument(client, id);
      return (await client.query<VersionRow>(
        'SELECT * FROM documents.document_versions WHERE document_id = $1 ORDER BY version DESC',
        [id],
      )).rows;
    });
  }

  /** Adiciona nova versão de um documento existente. */
  public addVersion(context: RequestContext, docId: string, dto: AddVersionDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const doc = await this.requireDocument(client, docId);

      // Novo storage key versionado
      const versionNum = await this.nextVersionNumber(client, docId);
      const storageKey = `${context.tenantId}/${docId}/v${versionNum}/${doc.name}`;
      const versionId = randomUUID();
      const ledgerId = randomUUID();

      const payload = { documentId: docId, version: versionNum, hash: dto.hash, changeNote: dto.changeNote };

      await client.query<VersionRow>(
        `INSERT INTO documents.document_versions
          (id, document_id, version, hash, storage_key, size_bytes, change_note, created_by, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [versionId, docId, versionNum, dto.hash, storageKey, dto.sizeBytes, dto.changeNote ?? null, context.userId, ledgerId],
      );

      // Atualiza o hash e storage_key do documento principal
      await client.query(
        'UPDATE documents.documents SET hash = $2, storage_key = $3, size_bytes = $4 WHERE id = $1',
        [docId, dto.hash, storageKey, dto.sizeBytes],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DOCUMENT_VERSION', entityId: versionId,
        actionType: PHASE_3_DOCUMENT_EVENTS.DOCUMENT_VERSION_ADDED, payload,
        changes: [{ field_path: 'hash', old_value: doc.hash, new_value: dto.hash }],
      });

      const uploadUrl = await this.minio.presignedPutUrl(storageKey);
      return { versionId, version: versionNum, storageKey, uploadUrl, expiresInSeconds: 300 };
    });
  }

  /**
   * POST /documents/:id/anonymize — Anonimiza dados pessoais do documento.
   * LGPD art. 18: dado pessoal é mascarado mas o registro e o ledger são PRESERVADOS.
   */
  public anonymize(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const doc = await this.requireDocument(client, id);
      if (!doc.contains_personal_data) {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Documento não contém dados pessoais marcados.' });
      }

      const anonName = `[ANONIMIZADO]-${createHash('sha256').update(doc.name).digest('hex').slice(0, 8)}`;
      const ledgerId = randomUUID();

      await client.query(
        `UPDATE documents.documents
         SET name = $2, contains_personal_data = false, classification = 'PRIVATE'
         WHERE id = $1`,
        [id, anonName],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DOCUMENT', entityId: id,
        actionType: PHASE_3_DOCUMENT_EVENTS.DOCUMENT_ANONYMIZED,
        payload: { documentId: id, originalNameHash: createHash('sha256').update(doc.name).digest('hex') },
        changes: [
          { field_path: 'name', old_value: '[REDACTED]', new_value: anonName },
          { field_path: 'contains_personal_data', old_value: true, new_value: false },
          { field_path: 'classification', old_value: doc.classification, new_value: 'PRIVATE' },
        ],
      });

      return { documentId: id, anonymized: true, ledgerBlockId: ledgerId };
    });
  }

  /**
   * POST /documents/:id/segvoo-001 — Gera XML SEGVOO 001 e cria nova versão.
   * Documento regulatório conforme matriz ANAC.
   */
  public generateSegvoo001(context: RequestContext, id: string, dto: GenerateSegvoo001Dto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      await this.requireDocument(client, id);

      const xml = this.buildSegvoo001Xml(dto, context, id);
      const xmlBuffer = Buffer.from(xml, 'utf8');
      const hash = createHash('sha256').update(xmlBuffer).digest('hex');

      const versionNum = await this.nextVersionNumber(client, id);
      const storageKey = `${context.tenantId}/${id}/v${versionNum}/SEGVOO-001.xml`;
      const versionId = randomUUID();
      const ledgerId = randomUUID();

      // Upload direto (gerado internamente, não via presigned URL)
      await this.minio.putObject(storageKey, xmlBuffer, 'application/xml');

      await client.query(
        `INSERT INTO documents.document_versions
          (id, document_id, version, hash, storage_key, size_bytes, change_note, created_by, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [versionId, id, versionNum, hash, storageKey, xmlBuffer.length, 'Gerado: SEGVOO 001', context.userId, ledgerId],
      );

      await client.query(
        'UPDATE documents.documents SET hash = $2, storage_key = $3, size_bytes = $4, document_type = $5, mime_type = $6 WHERE id = $1',
        [id, hash, storageKey, xmlBuffer.length, 'SEGVOO_001', 'application/xml'],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'DOCUMENT_VERSION', entityId: versionId,
        actionType: PHASE_3_DOCUMENT_EVENTS.DOCUMENT_VERSION_ADDED,
        payload: { documentId: id, version: versionNum, documentType: 'SEGVOO_001', hash },
      });

      const downloadUrl = await this.minio.presignedGetUrl(storageKey);
      return { versionId, version: versionNum, hash, downloadUrl, expiresInSeconds: 300 };
    });
  }

  // ─────────────────── Helpers ───────────────────

  private async requireDocument(client: { query: DatabaseService['query'] }, id: string): Promise<DocumentRow> {
    const doc = (await client.query<DocumentRow>(
      'SELECT * FROM documents.documents WHERE id = $1',
      [id],
    )).rows[0];
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
    return doc;
  }

  private async nextVersionNumber(client: { query: DatabaseService['query'] }, docId: string): Promise<number> {
    const row = (await client.query<{ max: string | null }>(
      'SELECT MAX(version) AS max FROM documents.document_versions WHERE document_id = $1',
      [docId],
    )).rows[0];
    return (Number(row?.max ?? 0)) + 1;
  }

  private buildSegvoo001Xml(dto: GenerateSegvoo001Dto, context: RequestContext, documentId: string): string {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- VORTEX — SEGVOO 001 | Gerado em: ${now} | Documento: ${documentId} -->
<!-- Fundamento: IS 153-01 / ANAC — Sistema de Gerenciamento de Segurança -->
<SEGVOO xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" versao="001">
  <Cabecalho>
    <NumeroDocumento>${documentId}</NumeroDocumento>
    <DataHoraGeracao>${now}</DataHoraGeracao>
    <TenantId>${context.tenantId}</TenantId>
    <OperadorId>${context.userId}</OperadorId>
  </Cabecalho>
  <Ocorrencia>
    <AeronauteEmComando>${this.escapeXml(dto.pilotoEmComando)}</AeronauteEmComando>
    <RegistroAeronave>${this.escapeXml(dto.aeronaveRegistro)}</RegistroAeronave>
    <Origem>${this.escapeXml(dto.origem)}</Origem>
    <Destino>${this.escapeXml(dto.destino)}</Destino>
    <DataHoraVoo>${this.escapeXml(dto.dataHoraVoo)}</DataHoraVoo>
    <Relato><![CDATA[${dto.relato}]]></Relato>
  </Ocorrencia>
  <Integridade>
    <AlgoritmoHash>SHA-256</AlgoritmoHash>
    <HashConteudo></HashConteudo><!-- preenchido pelo hash final do arquivo -->
  </Integridade>
</SEGVOO>`;
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
}
