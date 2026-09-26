export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export const ERROR_CODES = {
  AUTH_REQUIRED: 401,
  TOKEN_EXPIRED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  IDEMPOTENCY_CONFLICT: 409,
  LEDGER_VERIFICATION_FAILED: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiError {
  code: ErrorCode;
  message: string;
  request_id: string;
  details?: Readonly<Record<string, unknown>>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface RequestContext {
  requestId: string;
  userId: string;
  tenantId: string;
  companyId?: string;
  roles: readonly string[];
  scopes: readonly string[];
}
