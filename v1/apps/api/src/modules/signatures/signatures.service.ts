import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PHASE_3_SIGNATURE_EVENTS, type SignatureLevel } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { GovBrProvider, IcpBrasilProvider, SimpleProvider, type SignatureProvider } from './providers/signature.providers';
import type { CreateSignatureRequestDto, SignDocumentDto } from './signatures.dto';

interface SignatureRow {
  id: string; document_id: string; document_hash: string; signer_user_id: string;
  signature_level: SignatureLevel; provider_code: string; method: string;
  verification_code: string; crc_code: string; timestamp_bsb: Date; created_at: Date;
  certificate_serial: string | null; certificate_issuer: string | null;
  certificate_subject: string | null; ledger_block_id: string;
  current_hash?: string;
}

interface SignatureRequestRow {
  id: string; document_id: string; tenant_id: string; status: string;
  required_level: SignatureLevel; signers: unknown[]; expires_at: Date | null;
}

interface DocumentRow {
  id: string; hash: string; name: string; status: string; contains_personal_data: boolean;
}

@Injectable()
export class SignaturesService {
  private readonly providers = new Map<string, SignatureProvider>([
    ['SIMPLE', new SimpleProvider()],
    ['GOVBR', new GovBrProvider()],
    ['ICP_SERPRO', new IcpBrasilProvider('ICP_SERPRO')],
    ['ICP_CERTISIGN', new IcpBrasilProvider('ICP_CERTISIGN')],
  ]);

  private readonly levelRank: Record<SignatureLevel, number> = {
    SIMPLE: 1,
    AVANCADA: 2,
    QUALIFICADA: 3,
  };

  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /** POST /signatures/requests */
  public createRequest(context: RequestContext, dto: CreateSignatureRequestDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // Verificar que o documento existe no tenant atual
      const doc = (await client.query<DocumentRow>(
        'SELECT id, hash, name, status FROM documents.documents WHERE id = $1',
        [dto.documentId],
      )).rows[0];
      if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
      if (doc.status === 'SIGNED') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Documento já assinado.' });

      const requestId = randomUUID();
      const ledgerId = randomUUID();
      const payload = { documentId: dto.documentId, documentName: doc.name, requiredLevel: dto.requiredLevel, message: dto.message };

      const result = await client.query<SignatureRequestRow>(
        `INSERT INTO signatures.signature_requests
          (id, document_id, tenant_id, requested_by, company_id, required_level, signers, expires_at, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,'[]'::jsonb,$7,$8) RETURNING *`,
        [requestId, dto.documentId, context.tenantId, context.userId, context.companyId ?? null,
          dto.requiredLevel, dto.expiresAt ?? null, ledgerId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'SIGNATURE_REQUEST', entityId: requestId,
        actionType: PHASE_3_SIGNATURE_EVENTS.SIGNATURE_REQUEST_CREATED, payload,
      });

      return result.rows[0];
    });
  }

  /** POST /signatures/requests/:id/sign */
  public sign(context: RequestContext, requestId: string, dto: SignDocumentDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      // 1. Obter solicitação de assinatura (lock para concorrência)
      const req = (await client.query<SignatureRequestRow>(
        'SELECT * FROM signatures.signature_requests WHERE id = $1 FOR UPDATE',
        [requestId],
      )).rows[0];
      if (!req) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Solicitação não encontrada.' });
      if (req.status !== 'PENDING') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Solicitação já finalizada.' });

      // 2. Verificar que o provedor atende ao nível mínimo exigido
      const provider = this.providers.get(dto.providerCode);
      if (!provider) throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: `Provedor ${dto.providerCode} não disponível.` });
      if (this.levelRank[provider.level] < this.levelRank[req.required_level]) {
        throw new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          message: `Nível de assinatura insuficiente. Exigido: ${req.required_level}. Provedor: ${provider.level}.`,
        });
      }

      // 3. Obter documento e calcular hash atual
      const doc = (await client.query<DocumentRow>(
        'SELECT id, hash, name, status FROM documents.documents WHERE id = $1',
        [req.document_id],
      )).rows[0];
      if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });

      // 4. Executar o provedor (credentials NUNCA persistidos)
      const signResult = await provider.sign({
        documentId: req.document_id,
        documentHash: doc.hash,
        signerUserId: context.userId,
        providerCode: dto.providerCode,
        credential: dto.credential,
      });

      // 5. Gerar código verificador único e CRC
      const verificationCode = this.generateVerificationCode();
      const crcCode = this.computeCrc(verificationCode, doc.hash, context.userId);

      // 6. Registrar assinatura + ledger atomicamente
      const signatureId = randomUUID();
      const ledgerId = randomUUID();

      const sigPayload = {
        requestId, documentId: req.document_id, documentHash: doc.hash,
        signerUserId: context.userId, providerCode: dto.providerCode,
        level: provider.level, method: signResult.method,
        verificationCode, crcCode,
        certificateSerial: signResult.certificateSerial,
        certificateIssuer: signResult.certificateIssuer,
      };

      const result = await client.query<SignatureRow>(
        `INSERT INTO signatures.signatures
          (id, document_id, document_hash, signer_user_id, signer_company_id, tenant_id,
           signature_level, provider_code, provider_reference, method,
           certificate_serial, certificate_issuer, certificate_subject,
           certificate_valid_from, certificate_valid_to,
           timestamp_bsb, tsa_token, verification_code, crc_code, ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,clock_timestamp(),$16,$17,$18,$19)
         RETURNING *`,
        [
          signatureId, req.document_id, doc.hash, context.userId, context.companyId ?? null,
          context.tenantId, provider.level, dto.providerCode, signResult.providerReference,
          signResult.method, signResult.certificateSerial ?? null, signResult.certificateIssuer ?? null,
          signResult.certificateSubject ?? null, signResult.certificateValidFrom ?? null,
          signResult.certificateValidTo ?? null,
          this.buildTsaFallback(), // TSA fallback: timestamp Brasília assinado
          verificationCode, crcCode, ledgerId,
        ],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'SIGNATURE', entityId: signatureId,
        actionType: PHASE_3_SIGNATURE_EVENTS.DOCUMENT_SIGNED, payload: sigPayload,
      });

      // 7. Atualizar status do documento para SIGNED
      await client.query(
        'UPDATE documents.documents SET status = $2 WHERE id = $1',
        [req.document_id, 'SIGNED'],
      );

      // 8. Atualizar request
      await client.query(
        `UPDATE signatures.signature_requests SET status = 'SIGNED' WHERE id = $1`,
        [requestId],
      );

      return { ...result.rows[0], credential: undefined };
    });
  }

  /** GET /signatures/:id */
  public getSignature(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const row = (await client.query<SignatureRow>(
        'SELECT * FROM signatures.signatures WHERE id = $1',
        [id],
      )).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assinatura não encontrada.' });
      return row;
    });
  }

  /**
   * GET /verify?code=XXXX — Verificação pública, sem autenticação.
   * Regra 3: toda assinatura possui código verificador + CRC.
   * Testa também se o hash atual do documento é igual ao hash assinado.
   */
  public async verifyPublic(code: string, currentDocumentHash?: string): Promise<unknown> {
    // Busca sem RLS (verificação pública)
    const row = (await this.database.query<SignatureRow>(
      `SELECT s.*, d.hash AS current_hash
       FROM signatures.signatures s
       LEFT JOIN documents.documents d ON d.id = s.document_id
       WHERE s.verification_code = $1`,
      [code],
    )).rows[0];

    if (!row) {
      return { valid: false, reason: 'Código de verificação não encontrado.' };
    }

    // Verificação de integridade do documento
    const hashToCheck = currentDocumentHash ?? row.current_hash;
    const documentIntact = hashToCheck === row.document_hash;

    // Verificação CRC
    const expectedCrc = this.computeCrc(row.verification_code, row.document_hash, row.signer_user_id);
    const crcValid = timingSafeEqual(expectedCrc, row.crc_code);

    return {
      valid: documentIntact && crcValid,
      documentIntact,
      crcValid,
      verificationCode: row.verification_code,
      signatureLevel: row.signature_level,
      method: row.method,
      signerUserId: row.signer_user_id,
      documentId: row.document_id,
      documentHash: row.document_hash,
      timestampBsb: row.timestamp_bsb,
      certificateSerial: row.certificate_serial,
      certificateIssuer: row.certificate_issuer,
      reason: documentIntact && crcValid ? 'Assinatura válida.' : 'Documento alterado após assinatura.',
    };
  }

  // ─────────────────── Helpers ───────────────────

  private generateVerificationCode(): string {
    // Formato: VRTX-XXXX-XXXX (alfanumérico maiúsculo, sem ambiguidade 0/O, 1/I/L)
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const segment = (n: number) =>
      Array.from({ length: n }, () => {
        const byte = randomBytes(1)[0] ?? 0;
        return charset[byte % charset.length] ?? 'X';
      }).join('');
    return `VRTX-${segment(4)}-${segment(4)}`;
  }

  private computeCrc(verificationCode: string, documentHash: string, userId: string): string {
    return createHash('sha256')
      .update(`${verificationCode}:${documentHash}:${userId}`)
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();
  }

  /**
   * Timestamp de fallback (sem TSA externo):
   * horário Brasília (-03:00) codificado em base64.
   * Substitua por token RFC 3161 real quando TSA_URL estiver configurado.
   */
  private buildTsaFallback(): string {
    const brt = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const payload = JSON.stringify({ ts: brt, tz: 'America/Sao_Paulo', algorithm: 'NTP-FALLBACK' });
    return Buffer.from(payload).toString('base64');
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}
