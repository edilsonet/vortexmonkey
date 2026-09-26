import { Injectable, inject } from '@angular/core';
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ListSessionsResponse,
  LoginRequest,
  LoginResponse,
  RevokeSessionResponse,
  RevokeSessionsResponse,
} from '@vortex/shared-dto';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { ApiClient } from '../api/api-client.service';
import { VortexApiError } from '../api/api-error';
import { SessionStore } from './session.store';

/** Autenticacao: login por vinculo e encerramento de sessao. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);

  /** Compartilha uma unica renovacao entre requisicoes que expiraram juntas. */
  private refreshInFlight: Observable<LoginResponse> | null = null;

  readonly session = this.store.session;
  readonly context = this.store.context;
  readonly isAuthenticated = this.store.isAuthenticated;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', request)
      .pipe(tap((response) => this.store.set(response, request.email)));
  }

  /**
   * Renova o access token a partir do refresh token. Erros propagam; o
   * interceptor decide encerrar a sessao.
   */
  refresh(): Observable<LoginResponse> {
    const refreshToken = this.store.refreshToken();
    if (refreshToken === null) {
      return throwError(() => VortexApiError.unexpected('Sessao sem refresh token.'));
    }
    this.refreshInFlight ??= this.api
      .post<LoginResponse>('/auth/refresh', { refreshToken })
      .pipe(
        tap((response) => this.store.set(response, this.store.email())),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight;
  }

  logout(): void {
    const refreshToken = this.store.refreshToken();
    if (refreshToken !== null) {
      // Revogacao best-effort: a sessao local sai mesmo se a API falhar.
      this.api
        .post<{ revoked: number }>('/auth/logout', { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.store.clear();
  }

  /**
   * Encerra TODAS as sessoes do usuario (todos os dispositivos/tenants). A
   * sessao local tambem e descartada assim que a API confirma.
   */
  revokeAllSessions(): Observable<RevokeSessionsResponse> {
    return this.api
      .post<RevokeSessionsResponse>('/auth/sessions/revoke', {})
      .pipe(tap(() => this.store.clear()));
  }

  /**
   * Troca a senha. A API revoga todas as sessoes (inclusive a atual), entao a
   * sessao local e descartada no sucesso.
   */
  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.api
      .post<ChangePasswordResponse>('/auth/password', request)
      .pipe(tap(() => this.store.clear()));
  }

  /** Sessoes ativas do usuario (uma por dispositivo). */
  listSessions(): Observable<ListSessionsResponse> {
    return this.api.get<ListSessionsResponse>('/auth/sessions');
  }

  /**
   * Encerra uma sessao especifica. Se for a sessao atual, a sessao local e
   * descartada (a familia revogada e a que sustenta o refresh).
   */
  revokeSession(sessionId: string): Observable<RevokeSessionResponse> {
    return this.api
      .post<RevokeSessionResponse>(`/auth/sessions/${sessionId}/revoke`, {})
      .pipe(tap(() => {
        if (this.store.sessionId() === sessionId) {
          this.store.clear();
        }
      }));
  }
}
