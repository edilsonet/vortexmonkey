import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { computeCrc, generateVerificationCode } from "@vortex/utils";
import type { ProviderCode, RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import { providers } from "./providers/signature.providers.ts";
import type { CreateSignatureRequestDto, SignDocumentDto } from "./signatures.dto.ts";

@Injectable()
export class SignaturesService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public listProviders() {
    return this.db.query(
      "SELECT code, name, level, status FROM signatures.signature_providers WHERE status = 'ACTIVE' ORDER BY level",
    ).then((r) => r.rows);
  }

  public list(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const result = await client.query(
        `SELECT id, document_id, signature_level, provider_code, method, verification_code, crc_code, timestamp_bsb
         FROM signatures.signatures ORDER BY created_at DESC LIMIT 100`,
      );
      return result.rows;
    });
  }

  public createRequest(ctx: RequestContext, dto: CreateSignatureRequestDto) {
    return this.db.withContext(ctx, async (client) => {
      const doc = await client.query<{ id: string; hash: string }>(
        "SELECT id, hash FROM documents.documents WHERE id = $1",
        [dto.documentId],
      );
      if (!doc.rows[0]) throw new NotFoundException({ code: "NOT_FOUND", message: "Documento nao encontrado." });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO signatures.signature_requests(document_id, tenant_id, requested_by, company_id, required_level, signers)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
        [dto.documentId, ctx.tenantId, ctx.personId, ctx.companyId, dto.requiredLevel, dto.signers ?? "[]"],
      );
      const id = inserted.rows[0]!.id;
      await client.query("UPDATE documents.documents SET status = 'PENDING_SIGN' WHERE id = $1", [dto.documentId]);
      const block = await this.ledger.append(client, ctx, {
        entityType: "SIGNATURE_REQUEST", entityId: id, actionType: "SIGNATURE_REQUESTED", payload: dto,
      });
      await client.query("UPDATE signatures.signature_requests SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public sign(ctx: RequestContext, dto: SignDocumentDto, meta: { ip?: string; ua?: string }) {
    const provider = providers[dto.providerCode];
    if (!provider) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Provedor desconhecido." });
    }
    return this.db.withContext(ctx, async (client) => {
      const doc = await client.query<{ id: string; hash: string; name: string }>(
        "SELECT id, hash, name FROM documents.documents WHERE id = $1",
        [dto.documentId],
      );
      const row = doc.rows[0];
      if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Documento nao encontrado." });
      const result = await provider.sign({
        documentId: row.id,
        documentHash: row.hash,
        signerUserId: ctx.personId,
        providerCode: dto.providerCode as ProviderCode,
        credential: dto.credential,
        ipAddress: meta.ip,
        userAgent: meta.ua,
      });
      const verificationCode = generateVerificationCode();
      const crc = computeCrc(verificationCode, row.hash, ctx.personId);
      const id = crypto.randomUUID();
      const block = await this.ledger.append(client, ctx, {
        entityType: "SIGNATURE",
        entityId: id,
        actionType: "DOCUMENT_SIGNED",
        payload: { documentId: row.id, level: provider.level, provider: dto.providerCode, verificationCode },
      });
      await client.query(
        `INSERT INTO signatures.signatures(
           id, document_id, document_hash, signer_person_id, signer_company_id, tenant_id,
           signature_level, provider_code, provider_reference, method,
           certificate_serial, certificate_issuer, tsa_token, ip_address, user_agent,
           verification_code, crc_code, ledger_block_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          id, row.id, row.hash, ctx.personId, ctx.companyId, ctx.tenantId,
          provider.level, dto.providerCode, result.providerReference, result.method,
          result.certificateSerial ?? null, result.certificateIssuer ?? null, result.tsaToken ?? null,
          meta.ip ?? null, meta.ua ?? null, verificationCode, crc, block.id,
        ],
      );
      await client.query("UPDATE documents.documents SET status = 'SIGNED' WHERE id = $1", [row.id]);
      await client.query(
        "UPDATE signatures.signature_requests SET status = 'SIGNED' WHERE document_id = $1 AND status = 'PENDING'",
        [row.id],
      );
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Assinatura ${provider.level} ${row.name}`,
        entityType: "SIGNATURE",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, verificationCode, crc, protocol: proto.number, level: provider.level };
    });
  }

  public async verifyPublic(code: string) {
    const result = await this.db.query<{
      verification_code: string;
      crc_code: string;
      signature_level: string;
      method: string;
      timestamp_bsb: string;
      document_hash: string;
      document_name: string;
      document_id: string;
    }>(
      `SELECT s.verification_code, s.crc_code, s.signature_level, s.method, s.timestamp_bsb,
              s.document_hash, d.name AS document_name, s.document_id
       FROM signatures.signatures s
       JOIN documents.documents d ON d.id = s.document_id
       WHERE s.verification_code = $1`,
      [code],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Codigo de verificacao invalido." });
    return {
      valid: true,
      verificationCode: row.verification_code,
      crc: row.crc_code,
      level: row.signature_level,
      method: row.method,
      signedAt: row.timestamp_bsb,
      documentHash: row.document_hash,
      documentName: row.document_name,
    };
  }
}
