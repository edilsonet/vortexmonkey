import { HttpErrorResponse, HttpRequest, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ApiFailure } from '@vortex/shared-dto';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_ENDPOINTS = /\/auth\/(login|refresh|logout)(\?|$)/;

/**
 * Anexa a credencial e a chave de idempotencia e renova o access token vencido.
 *
 * Regra 6: toda escrita exige `Idempotency-Key`. O interceptor a gera uma vez
 * por requisicao (nunca reaproveita entre tentativas distintas do usuario).
 *
 * Ao receber `TOKEN_EXPIRED`, renova a sessao (uma unica renovacao compartilhada
 * para chamadas simultaneas) e repete a requisicao UMA vez, preservando a mesma
 * `Idempotency-Key`. Se a renovacao falhar, encerra a sessao. Requisicoes para
 * `/auth/*` nunca disparam renovacao — evita laco entre refresh e 401.
 */
export const vortexAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(SessionStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = AUTH_ENDPOINTS.test(request.url);
  let prepared = request;
  const token = store.token();

  if (!isAuthEndpoint && token && !request.headers.has('Authorization')) {
    prepared = prepared.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  if (MUTATING_METHODS.has(request.method) && !prepared.headers.has('Idempotency-Key')) {
    prepared = prepared.clone({ setHeaders: { 'Idempotency-Key': newIdempotencyKey() } });
  }

  return next(prepared).pipe(
    catchError((error: unknown) => {
      if (isAccessTokenExpired(error) && !isAuthEndpoint && store.refreshToken() !== null) {
        return auth.refresh().pipe(
          switchMap(() => next(applyToken(prepared, store.token()))),
          catchError((failure: unknown) => {
            endSession(store, router);
            return throwError(() => failure);
          }),
        );
      }
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const code = (error.error as ApiFailure | null)?.error?.code;
        if (code === 'AUTH_REQUIRED' || code === 'TOKEN_EXPIRED') {
          endSession(store, router);
        }
      }
      return throwError(() => error);
    }),
  );
};

function isAccessTokenExpired(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false;
  }
  return (error.error as ApiFailure | null)?.error?.code === 'TOKEN_EXPIRED';
}

function applyToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token === null
    ? request
    : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function endSession(store: SessionStore, router: Router): void {
  store.clear();
  void router.navigate(['/entrar'], { queryParams: { redirectTo: router.url } });
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `vx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
