import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { sha256Hex } from "@vortex/utils";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import { StorageService } from "../../platform/storage/storage.service.ts";
import type { AddVersionDto, InitiateUploadDto } from "./documents.dto.ts";
import { assertUploadPolicy } from "./documents.policy.ts";

@Injectable()
export class DocumentsService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, name, mime_type, hash, classification, status, document_type, contains_personal_data, created_at
         FROM documents.documents ORDER BY created_at DESC LIMIT 100`,
      );
      return result.rows;
    });
  }

  public initiateUpload(ctx: RequestContext, dto: InitiateUploadDto) {
    try {
      assertUploadPolicy(dto);
    } catch (error) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Upload invalido.",
      });
    }
    return this.db.withContext(ctx, async (client) => {
      const key = `${ctx.tenantId}/${crypto.randomUUID()}`;
      if (dto.content) {
        const body = Buffer.from(dto.content, "utf8");
        const hash = sha256Hex(body);
        if (hash !== dto.hash) {
          throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Hash divergente do conteudo." });
        }
        await this.storage.putObject(key, body);
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO documents.documents(
           tenant_id, name, mime_type, size_bytes, hash, storage_key, classification,
           contains_personal_data, document_type, created_by, company_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          ctx.tenantId, dto.name, dto.mimeType, dto.sizeBytes, dto.hash, key, dto.classification,
          dto.containsPersonalData, dto.documentType ?? "OUTRO", ctx.personId, ctx.companyId,
        ],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "DOCUMENT", entityId: id, actionType: "DOCUMENT_CREATED", payload: { name: dto.name, hash: dto.hash },
      });
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Documento ${dto.name}`, entityType: "DOCUMENT", entityId: id, ledgerBlockId: block.id,
      });
      await client.query("UPDATE documents.documents SET protocol_id = $2, ledger_block_id = $3 WHERE id = $1", [id, proto.id, block.id]);
      await client.query(
        `INSERT INTO documents.document_versions(document_id, version, hash, storage_key, size_bytes, created_by, ledger_block_id)
         VALUES ($1,1,$2,$3,$4,$5,$6)`,
        [id, dto.hash, key, dto.sizeBytes, ctx.personId, block.id],
      );
      const upload = await this.storage.presignedPutUrl(key);
      return { documentId: id, protocol: proto.number, uploadUrl: upload.url, expiresIn: upload.expiresIn };
    });
  }

  public get(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const doc = await client.query("SELECT * FROM documents.documents WHERE id = $1", [id]);
      if (!doc.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Documento nao encontrado." });
      const versions = await client.query(
        "SELECT id, version, hash, change_note, created_at FROM documents.document_versions WHERE document_id = $1 ORDER BY version",
        [id],
      );
      const download = await this.storage.presignedGetUrl(doc.rows[0].storage_key as string);
      return { document: doc.rows[0], versions: versions.rows, downloadUrl: download.url, expiresIn: download.expiresIn };
    });
  }

  public addVersion(ctx: RequestContext, id: string, dto: AddVersionDto) {
    return this.db.withContext(ctx, async (client) => {
      const doc = await client.query<{ id: string }>("SELECT id FROM documents.documents WHERE id = $1", [id]);
      if (!doc.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Documento nao encontrado." });
      const max = await client.query<{ n: string }>("SELECT coalesce(max(version),0)::text AS n FROM documents.document_versions WHERE document_id = $1", [id]);
      const version = Number(max.rows[0]?.n ?? 0) + 1;
      const key = `${ctx.tenantId}/${id}/v${version}`;
      if (dto.content) await this.storage.putObject(key, Buffer.from(dto.content, "utf8"));
      const block = await this.ledger.append(client, ctx, {
        entityType: "DOCUMENT", entityId: id, actionType: "DOCUMENT_VERSION_ADDED", payload: { version, hash: dto.hash },
      });
      await client.query(
        `INSERT INTO documents.document_versions(document_id, version, hash, storage_key, size_bytes, change_note, created_by, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, version, dto.hash, key, dto.sizeBytes, dto.changeNote ?? null, ctx.personId, block.id],
      );
      await client.query("UPDATE documents.documents SET hash = $2, storage_key = $3, size_bytes = $4 WHERE id = $1", [id, dto.hash, key, dto.sizeBytes]);
      return { version };
    });
  }

  public anonymize(ctx: RequestContext, id: string) {
    return this.db.withContext(ctx, async (client) => {
      const doc = await client.query<{ contains_personal_data: boolean; name: string }>(
        "SELECT contains_personal_data, name FROM documents.documents WHERE id = $1",
        [id],
      );
      const row = doc.rows[0];
      if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Documento nao encontrado." });
      if (!row.contains_personal_data) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Documento sem dado pessoal." });
      }
      await client.query(
        "UPDATE documents.documents SET name = $2, contains_personal_data = false, classification = 'RESTRICTED' WHERE id = $1",
        [id, "documento-anonimizado.md"],
      );
      await this.ledger.append(client, ctx, { entityType: "DOCUMENT", entityId: id, actionType: "DOCUMENT_ANONYMIZED", payload: {} });
      return { anonymized: true };
    });
  }

  public async segvoo001(ctx: RequestContext, payload: { aircraft: string; occurrence: string }) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><segvoo001><aircraft>${payload.aircraft}</aircraft><occurrence>${payload.occurrence}</occurrence></segvoo001>`;
    const hash = sha256Hex(xml);
    return this.initiateUpload(ctx, {
      name: "SEGVOO-001.xml",
      mimeType: "application/xml",
      sizeBytes: Buffer.byteLength(xml),
      hash,
      classification: "RESTRICTED",
      containsPersonalData: false,
      documentType: "SEGVOO_001",
      content: xml,
    });
  }
}
