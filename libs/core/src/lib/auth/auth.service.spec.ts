import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { VORTEX_CORE_CONFIG } from '../config';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

const session = {
  token: 'access-seed',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  refreshToken: 'refresh-seed',
  refreshExpiresIn: 2_592_000,
  sessionId: 'session-seed',
  context: { userId: 'user-1', tenantId: 'tenant-1', companyId: 'company-1' },
};

describe('AuthService (gestao de sessoes)', () => {
  let auth: AuthService;
  let store: SessionStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: 'http://api.test' } },
      ],
    });
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(SessionStore);
    httpTesting = TestBed.inject(HttpTestingController);
    store.set(session, 'dono@vortex.dev');
  });

  afterEach(() => httpTesting.verify());

  it('encerra todas as sessoes e descarta a sessao local no sucesso', async () => {
    const promise = firstValueFrom(auth.revokeAllSessions());
    const request = httpTesting.expectOne('http://api.test/auth/sessions/revoke');
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, data: { revoked: 3 }, error: null });

    await expect(promise).resolves.toEqual({ revoked: 3 });
    expect(store.session()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('troca a senha e descarta a sessao local (a API revoga todas)', async () => {
    const promise = firstValueFrom(
      auth.changePassword({ currentPassword: 'atual-123', newPassword: 'nova-senha-1' }),
    );
    const request = httpTesting.expectOne('http://api.test/auth/password');
    expect(request.request.body).toEqual({
      currentPassword: 'atual-123',
      newPassword: 'nova-senha-1',
    });
    request.flush({ success: true, data: { changed: true }, error: null });

    await expect(promise).resolves.toEqual({ changed: true });
    expect(store.session()).toBeNull();
  });

  it('mantem a sessao quando a troca de senha falha', async () => {
    const promise = firstValueFrom(
      auth.changePassword({ currentPassword: 'errada', newPassword: 'nova-senha-1' }),
    );
    const request = httpTesting.expectOne('http://api.test/auth/password');
    request.flush(
      { success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Senha atual' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    await expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(store.session()).not.toBeNull();
  });
});
