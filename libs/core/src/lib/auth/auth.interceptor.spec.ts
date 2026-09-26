import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { VORTEX_CORE_CONFIG } from '../config';
import { vortexAuthInterceptor } from './auth.interceptor';
import { SessionStore } from './session.store';

@Component({ standalone: true, template: '' })
class BlankComponent {}

const session = (suffix: string) => ({
  token: `access-${suffix}`,
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  refreshToken: `refresh-${suffix}`,
  refreshExpiresIn: 2_592_000,
  sessionId: `session-${suffix}`,
  context: { userId: 'user-1', tenantId: 'tenant-1', companyId: 'company-1' },
});

describe('vortexAuthInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let store: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([vortexAuthInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'entrar', component: BlankComponent }]),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: 'http://api.test' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
    store.set(session('seed'), 'dono@vortex.dev');
  });

  afterEach(() => httpTesting.verify());

  it('anexa Bearer e Idempotency-Key nas rotas de dominio', async () => {
    const promise = firstValueFrom(http.post('http://api.test/mro/aircraft', { a: 1 }));
    const request = httpTesting.expectOne('http://api.test/mro/aircraft');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-seed');
    expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
    request.flush({ ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('renova o token expirado e repete a requisicao com a mesma chave', async () => {
    const promise = firstValueFrom(http.post('http://api.test/mro/aircraft', { a: 1 }));
    const first = httpTesting.expectOne('http://api.test/mro/aircraft');
    const idempotencyKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      { success: false, data: null, error: { code: 'TOKEN_EXPIRED', message: 'expirado' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refresh = httpTesting.expectOne('http://api.test/auth/refresh');
    expect(refresh.request.headers.get('Authorization')).toBeNull();
    refresh.flush({ success: true, data: session('renewed'), error: null });

    const retry = httpTesting.expectOne('http://api.test/mro/aircraft');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-renewed');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(idempotencyKey);
    retry.flush({ ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('encerra a sessao quando a renovacao falha', async () => {
    const promise = firstValueFrom(http.get('http://api.test/mro/aircraft'));
    const first = httpTesting.expectOne('http://api.test/mro/aircraft');
    first.flush(
      { success: false, data: null, error: { code: 'TOKEN_EXPIRED', message: 'expirado' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refresh = httpTesting.expectOne('http://api.test/auth/refresh');
    refresh.flush(
      { success: false, data: null, error: { code: 'AUTH_REQUIRED', message: 'invalido' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(promise).rejects.toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
  });
});
