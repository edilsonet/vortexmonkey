import { Injectable, computed, inject, signal } from '@angular/core';
import type { LoginResponse, RequestContext } from '@vortex/shared-dto';
import { VORTEX_CORE_CONFIG } from '../config';

/** Sessao persistida localmente. */
export interface StoredSession {
  readonly token: string;
  readonly refreshToken: string | null;
  /** Familia de refresh tokens (a "sessao"); `null` em sessoes antigas. */
  readonly sessionId: string | null;
  readonly refreshExpiresAt: number;
  readonly context: RequestContext;
  readonly expiresAt: number;
  readonly email: string | null;
}

/**
 * Sessao do usuario em signals.
 *
 * `isAuthenticated` vale enquanto houver access token OU refresh token vivo: um
 * access token vencido nao forca novo login, pois o interceptor o renova na
 * primeira chamada. Sem nenhum dos dois, a sessao e descartada.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storageKey = inject(VORTEX_CORE_CONFIG).storageKey ?? 'vortex.session';
  private readonly state = signal<StoredSession | null>(this.restore());

  readonly session = this.state.asReadonly();
  readonly context = computed<RequestContext | null>(() => this.state()?.context ?? null);
  readonly isAuthenticated = computed(() => {
    const current = this.state();
    if (current === null) {
      return false;
    }
    return current.expiresAt > Date.now() || current.refreshExpiresAt > Date.now();
  });

  token(): string | null {
    return this.state()?.token ?? null;
  }

  refreshToken(): string | null {
    return this.state()?.refreshToken ?? null;
  }

  sessionId(): string | null {
    return this.state()?.sessionId ?? null;
  }

  email(): string | null {
    return this.state()?.email ?? null;
  }

  set(response: LoginResponse, email: string | null): void {
    const session: StoredSession = {
      token: response.token,
      refreshToken: response.refreshToken,
      sessionId: response.sessionId ?? null,
      refreshExpiresAt: Date.now() + response.refreshExpiresIn * 1000,
      context: response.context,
      expiresAt: Date.now() + response.expiresIn * 1000,
      email,
    };
    this.state.set(session);
    this.persist(session);
  }

  clear(): void {
    this.state.set(null);
    storage()?.removeItem(this.storageKey);
  }

  private restore(): StoredSession | null {
    const raw = storage()?.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      const accessAlive = typeof parsed.token === 'string' && parsed.expiresAt > Date.now();
      const refreshAlive =
        typeof parsed.refreshToken === 'string' && parsed.refreshExpiresAt > Date.now();
      if (!accessAlive && !refreshAlive) {
        storage()?.removeItem(this.storageKey);
        return null;
      }
      return parsed;
    } catch {
      storage()?.removeItem(this.storageKey);
      return null;
    }
  }

  private persist(session: StoredSession): void {
    storage()?.setItem(this.storageKey, JSON.stringify(session));
  }
}

/** `localStorage` com guarda para ambientes sem `window` (testes/build). */
function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}
