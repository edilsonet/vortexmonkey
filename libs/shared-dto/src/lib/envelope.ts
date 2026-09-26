/**
 * Envelope de resposta global do VORTEX (contrato imutavel, regra 5).
 *
 * Toda rota HTTP, sem excecao, responde em um dos dois formatos abaixo:
 *   { success: true,  data: <T>,  error: null }
 *   { success: false, data: null, error: { code, message, request_id? } }
 *
 * O frontend nunca valida regra regulatoria: ele apenas le `success` e, quando
 * falso, apresenta `error`. Este arquivo e a fonte unica do envelope.
 */

/** Codigos de erro canonicos e o status HTTP correspondente. */
export const ERROR_CODES = {
  AUTH_REQUIRED: 401,
  TOKEN_EXPIRED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  IDEMPOTENCY_CONFLICT: 409,
  LEDGER_VERIFICATION_FAILED: 500,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiErrorBody {
  readonly code: ErrorCode;
  readonly message: string;
  /** Correlaciona a falha com o log do servidor. */
  readonly request_id?: string;
  /** Detalhes de validacao (ex.: campos invalidos). Nunca um stack trace. */
  readonly details?: unknown;
}

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
}

export interface ApiFailure {
  readonly success: false;
  readonly data: null;
  readonly error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Resposta de sucesso. */
export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data, error: null };
}

/** Resposta de falha; `code` define o status HTTP via `httpStatusFor`. */
export function fail(code: ErrorCode, message: string, request_id?: string): ApiFailure {
  return {
    success: false,
    data: null,
    error: request_id === undefined ? { code, message } : { code, message, request_id },
  };
}

/** Status HTTP canonico do codigo de erro. */
export function httpStatusFor(code: ErrorCode): number {
  return ERROR_CODES[code];
}
