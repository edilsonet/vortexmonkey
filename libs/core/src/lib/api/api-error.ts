import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, ApiFailure, ErrorCode } from '@vortex/shared-dto';

/** Codigos do envelope mais os que so existem no cliente. */
export type VortexErrorCode = ErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_ERROR';

/**
 * Erro normalizado da API. O frontend nunca valida regra regulatoria: ele
 * apenas apresenta `message` e, quando util, `requestId` para correlacionar com
 * o log do servidor.
 */
export class VortexApiError extends Error {
  readonly code: VortexErrorCode;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: unknown;

  private constructor(
    code: VortexErrorCode,
    message: string,
    status: number,
    requestId: string | null,
    details: unknown,
  ) {
    super(message);
    this.name = 'VortexApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }

  static fromBody(body: ApiErrorBody, status: number): VortexApiError {
    return new VortexApiError(
      body.code,
      body.message,
      status,
      body.request_id ?? null,
      body.details ?? null,
    );
  }

  static network(message: string): VortexApiError {
    return new VortexApiError('NETWORK_ERROR', message, 0, null, null);
  }

  static unexpected(message: string): VortexApiError {
    return new VortexApiError('UNEXPECTED_ERROR', message, 0, null, null);
  }

  get isAuthError(): boolean {
    return this.code === 'AUTH_REQUIRED' || this.code === 'TOKEN_EXPIRED';
  }
}

/** Converte qualquer falha de transporte no erro normalizado do VORTEX. */
export function toVortexError(error: unknown): VortexApiError {
  if (error instanceof VortexApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiFailure | null;
    if (body && typeof body === 'object' && body.success === false && body.error) {
      return VortexApiError.fromBody(body.error, error.status);
    }
    if (error.status === 0) {
      return VortexApiError.network('Falha de rede: a API nao respondeu.');
    }
    return VortexApiError.unexpected(`Resposta inesperada da API (HTTP ${error.status}).`);
  }
  return VortexApiError.unexpected('Falha inesperada ao chamar a API.');
}
