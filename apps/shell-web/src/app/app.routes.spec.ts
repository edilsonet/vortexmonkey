import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CommunicationRealtime, SessionStore, VORTEX_CORE_CONFIG } from '@vortex/core';
import { App } from './app';
import { appRoutes } from './app.routes';

/** Respostas no envelope `{ success, data }` que o ApiClient desembrulha. */
const LEDGER_OK = { success: true, data: { valid: true, blocks: 3, tenantId: 't1', failure: null } };
const EMPTY_LIST = { success: true, data: [] };
const COMM_SUMMARY = {
  success: true,
  data: {
    counters: { chat: 0, alerts: 0, mail: 0, news: 0, notices: 0 },
    generatedAt: '2026-09-27T12:00:00.000Z',
  },
};

/**
 * Integracao de navegacao do host `shell-web`.
 *
 * Cobre o contrato acordado:
 *  - `/` ................ landing publica (Cosmic), acessivel com e sem sessao;
 *  - `/entrar` .......... login; autenticado e mantido (guestGuard so expulsa
 *                         de telas de acesso quando ha sessao — a landing fica);
 *  - `/app` ............. protegido: sem sessao cai em `/entrar?redirectTo=/app`;
 *  - `/app/mro/*` ....... protegido: redirectTo preserva o destino completo e,
 *                         com sessao, monta o remote federado sob o prefixo;
 *  - `/mro` ............. compat: redireciona para `/app/mro` (e termina no login).
 *
 * O socket.io realtime e substituido por um duble para nao abrir conexao.
 */
describe('navegacao do host (shell-web)', () => {
  let router: Router;
  let session: SessionStore;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: '/api', storageKey: 'vortex.test' } },
        // Isola o tempo real: nenhum socket em jsdom.
        {
          provide: CommunicationRealtime,
          useValue: { status: () => 'offline', disconnect: () => undefined },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    session = TestBed.inject(SessionStore);
    sessionStorage.clear();
    localStorage.clear();
    // Cria o root para o router-outlet renderizar as paginas roteadas.
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.clear();
    sessionStorage.clear();
  });

  /** Autentica o TestBed com uma sessao valida em memoria. */
  function login(): void {
    session.set(
      {
        token: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'test-refresh',
        refreshExpiresIn: 3600,
        sessionId: 'test-session',
        context: { userId: 'u1', tenantId: 't1', companyId: 'c1' },
      },
      'dono@vortex.dev',
    );
  }

  /** Navega e estabiliza: resolve loads lazy e roda a deteccao de mudancas. */
  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /**
   * Responde TODAS as chamadas pendentes de um endpoint.
   *
   * O chrome (`vx-vortex-shell`) verifica o ledger e hidrata a Central de
   * Comunicacao em paralelo com a pagina roteada — entao o mesmo endpoint pode
   * ter mais de uma requisicao em voo.
   */
  function flushAll(http: HttpTestingController, url: string, body: object): void {
    for (const call of http.match(url)) {
      expect(call.request.method).toBe('GET');
      call.flush(body);
    }
  }

  it('landing publica em "/" sem sessao', async () => {
    await go('/');
    expect(router.url).toBe('/');
    expect(document.body.textContent).toContain('VORTEX');
  }, 20000);

  it('"/entrar" mostra o formulario de acesso com as contas de seed', async () => {
    await go('/entrar');
    expect(router.url).toBe('/entrar');
    expect(document.body.textContent).toContain('Acessar');
    expect(document.body.textContent).toContain('Contas de desenvolvimento');
  }, 20000);

  it('"/app" sem sessao cai no login com redirectTo=/app', async () => {
    await go('/app');
    expect(router.url).toContain('/entrar');
    expect(router.url).toContain(encodeURIComponent('/app'));
  }, 20000);

  it('"/app/mro/conformidade" sem sessao preserva o destino completo', async () => {
    await go('/app/mro/conformidade');
    expect(router.url).toContain('/entrar');
    expect(router.url).toContain(encodeURIComponent('/app/mro/conformidade'));
  }, 20000);

  it('"/mro" (legado) vai para "/app/mro" e termina no login com o destino', async () => {
    await go('/mro');
    expect(router.url).toContain('/entrar');
    expect(router.url).toContain(encodeURIComponent('/app/mro'));
  }, 20000);

  it('com sessao, "/app" abre o cockpit (guard libera)', async () => {
    login();
    await go('/app');
    expect(router.url).toBe('/app');
    expect(document.body.textContent).toContain('Dashboard');

    // O cockpit so sai do loading apos ledger e frota responderem.
    const http = TestBed.inject(HttpTestingController);
    flushAll(http, '/api/ledger/verify', LEDGER_OK);
    flushAll(http, '/api/mro/aircraft', EMPTY_LIST);
    flushAll(http, '/api/communication/summary', COMM_SUMMARY);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Frota');
    expect(document.body.textContent).toContain('Nenhuma aeronave no seu vínculo');
    http.verify();
  }, 20000);

  it('com sessao, "/app/mro/conformidade" monta o remote federado sob o prefixo', async () => {
    login();
    await go('/app/mro/conformidade');
    expect(router.url).toBe('/app/mro/conformidade');

    const http = TestBed.inject(HttpTestingController);
    flushAll(http, '/api/ledger/verify', LEDGER_OK);
    flushAll(http, '/api/mro/aircraft', EMPTY_LIST);
    flushAll(http, '/api/communication/summary', COMM_SUMMARY);

    await fixture.whenStable();
    fixture.detectChanges();

    // Pagina de dominio do remote, montada dentro do shell do host.
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.shell')).not.toBeNull();
    expect(element.querySelector('vx-portal-dashboard-page')).toBeNull();
    expect(element.textContent).toContain('Nova aeronave');
    http.verify();
  }, 20000);

  it('com sessao, a landing continua acessivel (sem loop de login)', async () => {
    login();
    await go('/');
    expect(router.url).toBe('/');
    expect(document.body.textContent).toContain('Abrir dashboard');
  }, 20000);
});
