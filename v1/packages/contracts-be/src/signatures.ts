// Constantes e tipos de assinatura eletrônica (Lei 14.063/2020)

export const PHASE_3_SIGNATURE_EVENTS = {
  SIGNATURE_REQUEST_CREATED: 'SIGNATURE_REQUEST_CREATED',
  DOCUMENT_SIGNED: 'DOCUMENT_SIGNED',
  SIGNATURE_REQUEST_EXPIRED: 'SIGNATURE_REQUEST_EXPIRED',
} as const;

export type SignatureLevel = 'SIMPLE' | 'AVANCADA' | 'QUALIFICADA';
export type SignatureMethod = 'SENHA' | 'GOVBR_2FA' | 'CERTIFICADO_A1' | 'CERTIFICADO_A3';
export type SignatureRequestStatus = 'PENDING' | 'SIGNED' | 'PARTIALLY_SIGNED' | 'REJECTED' | 'EXPIRED';
export type ProviderCode = 'SIMPLE' | 'GOVBR' | 'ICP_SERPRO' | 'ICP_CERTISIGN';

export interface SignPayload {
  documentId: string;
  documentHash: string;
  signerUserId: string;
  providerCode: ProviderCode;
  credential: string; // senha, TOTP code, ou PEM do certificado
  ipAddress?: string;
  userAgent?: string;
}

export interface SignResult {
  providerReference: string;
  method: SignatureMethod;
  certificateSerial?: string;
  certificateIssuer?: string;
  certificateSubject?: string;
  certificateValidFrom?: Date;
  certificateValidTo?: Date;
  tsaToken?: string;
}

export interface VerifyPayload {
  verificationCode: string;
  currentDocumentHash: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  signature?: Record<string, unknown>;
}
