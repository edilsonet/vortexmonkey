import { HttpErrorResponse } from '@angular/common/http';
import type { ApiFailure } from '@vortex/shared-dto';
import { VortexApiError, toVortexError } from './api-error';

function failure(code: ApiFailure['error']['code'], message: string): ApiFailure {
  return { success: false, data: null, error: { code, message } };
}

describe('toVortexError', () => {
  it('preserva um erro ja normalizado', () => {
    const original = VortexApiError.network('sem rede');
    expect(toVortexError(original)).toBe(original);
  });

  it('extrai o envelope de falha do corpo HTTP', () => {
    const response = new HttpErrorResponse({
      status: 403,
      error: {
        success: false,
        data: null,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Sem vinculo ativo',
          request_id: 'req-1',
        },
      } satisfies ApiFailure,
    });

    const result = toVortexError(response);

    expect(result).toBeInstanceOf(VortexApiError);
    expect(result.code).toBe('PERMISSION_DENIED');
    expect(result.status).toBe(403);
    expect(result.requestId).toBe('req-1');
    expect(result.message).toBe('Sem vinculo ativo');
  });

  it('marca AUTH_REQUIRED como erro de autenticacao', () => {
    const response = new HttpErrorResponse({
      status: 401,
      error: failure('AUTH_REQUIRED', 'Credencial ausente'),
    });

    expect(toVortexError(response).isAuthError).toBe(true);
  });

  it('mapeia status 0 para NETWORK_ERROR', () => {
    const response = new HttpErrorResponse({ status: 0, error: null });

    const result = toVortexError(response);

    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.status).toBe(0);
  });

  it('trata corpo fora do envelope como UNEXPECTED_ERROR', () => {
    const response = new HttpErrorResponse({ status: 502, error: '<html>bad gateway</html>' });

    const result = toVortexError(response);

    expect(result.code).toBe('UNEXPECTED_ERROR');
    expect(result.message).toContain('502');
  });

  it('trata falha desconhecida como UNEXPECTED_ERROR', () => {
    expect(toVortexError(new Error('boom')).code).toBe('UNEXPECTED_ERROR');
  });
});
