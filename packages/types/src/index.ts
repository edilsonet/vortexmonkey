export type ApiSuccess<T> = { success: true; data: T; error: null };
export type ApiFailure = {
  success: false;
  data: null;
  error: { code: ErrorCode; message: string; details?: unknown };
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "TOKEN_EXPIRED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "IDEMPOTENCY_CONFLICT"
  | "LEDGER_VERIFICATION_FAILED";

export type ValidationLevel = "N0" | "N1" | "N2" | "N3";

export type RelationshipStatus = "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED";
export type ConfirmationSide = "PERSON" | "COMPANY";

export type Role =
  | "VISITANTE"
  | "RCONTA"
  | "CRIADOR_EMPRESA"
  | "ADMIN"
  | "REPRESENTANTE_LEGAL"
  | "PROCURADOR"
  | "PROPRIETARIO_OPERADOR"
  | "FUNCIONARIO"
  | "RESPONSAVEL_TECNICO";

export type CustodyKind = "PERSONAL" | "COMPANY" | "ERP";
export type StockOrigin = "PERSONAL" | "COMPANY" | "ERP_MRO" | "ERP_OPS" | "ERP_TRAINING" | "ERP_AIRPORT";

export type SignatureLevel = "SIMPLE" | "AVANCADA" | "QUALIFICADA";
export type SignatureMethod = "SENHA" | "GOVBR_2FA" | "CERTIFICADO_A1" | "CERTIFICADO_A3";
export type ProviderCode = "SIMPLE" | "GOVBR" | "ICP_SERPRO" | "ICP_CERTISIGN";
export type DocumentClassification = "PUBLIC" | "RESTRICTED" | "PRIVATE";
export type DocumentStatus = "DRAFT" | "PENDING_SIGN" | "SIGNED" | "ARCHIVED";

export interface SignPayload {
  documentId: string;
  documentHash: string;
  signerUserId: string;
  providerCode: ProviderCode;
  credential: string;
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

export interface RequestContext {
  userId: string;
  personId: string;
  tenantId: string | null;
  companyId: string | null;
  roles: Role[];
  scopes: string[];
}

export interface LedgerAppendInput {
  entityType: string;
  entityId: string;
  actionType: string;
  payload: unknown;
}

export const N_LEVEL_LABEL: Record<ValidationLevel, string> = {
  N0: "Pendente",
  N1: "Sistema",
  N2: "Fonte oficial",
  N3: "Autentico",
};
