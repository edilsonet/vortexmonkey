import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionStore, VORTEX_CORE_CONFIG } from '@vortex/core';
import { SessionPanel } from './session-panel';

@Component({ standalone: true, template: '' })
class BlankComponent {}

const CURRENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

const sessionRecord = (id: string, userAgent: string) => ({
  id,
  tenantId: 'tenant-1',
  companyId: 'company-1',
  userAgent,
  ipAddress: '127.0.0.1',
  createdAt: '2026-09-26T00:00:00.000Z',
  lastUsedAt: null,
  expiresAt: '2026-10-26T00:00:00.000Z',
});

describe('SessionPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionPanel],
      providers: [
        provideRouter([{ path: 'entrar', component: BlankComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: '/api' } },
      ],
    }).compileComponents();

    TestBed.inject(SessionStore).set(
      {
        token: 'access-1',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'refresh-1',
        refreshExpiresIn: 2_592_000,
        sessionId: CURRENT_ID,
        context: { userId: 'user-1', tenantId: 'tenant-1', companyId: 'company-1' },
      },
      'dono@vortex.dev',
    );
  });

  function render() {
    const fixture = TestBed.createComponent(SessionPanel);
    fixture.detectChanges();
    return fixture;
  }

  it('abre o painel, lista as sessoes e marca a atual', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.sp__panel')).toBeNull();

    element.querySelector<HTMLButtonElement>('.sp__btn')?.click();
    fixture.detectChanges();

    http.expectOne('/api/auth/sessions').flush({
      success: true,
      data: {
        sessions: [
          sessionRecord(CURRENT_ID, 'Chrome/120 (Linux)'),
          sessionRecord(OTHER_ID, 'Firefox/121'),
        ],
      },
      error: null,
    });
    fixture.detectChanges();

    const devices = Array.from(element.querySelectorAll('.sp__device')).map((node) =>
      node.textContent?.trim(),
    );
    expect(devices).toEqual(['Chrome/120 (Linux)', 'Firefox/121']);
    expect(element.querySelector('.sp__badge')?.textContent?.trim()).toBe('esta sessao');
  });

  it('encerra uma sessao remota e recarrega a lista', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.sp__btn')?.click();
    fixture.detectChanges();
    http.expectOne('/api/auth/sessions').flush({
      success: true,
      data: { sessions: [sessionRecord(CURRENT_ID, 'Chrome/120'), sessionRecord(OTHER_ID, 'Firefox')] },
      error: null,
    });
    fixture.detectChanges();

    const revokeButtons = element.querySelectorAll<HTMLButtonElement>('.sp__revoke');
    revokeButtons[1].click();
    fixture.detectChanges();

    const revoke = http.expectOne(`/api/auth/sessions/${OTHER_ID}/revoke`);
    expect(revoke.request.method).toBe('POST');
    revoke.flush({ success: true, data: { revoked: 1 }, error: null });
    fixture.detectChanges();

    http.expectOne('/api/auth/sessions').flush({
      success: true,
      data: { sessions: [sessionRecord(CURRENT_ID, 'Chrome/120')] },
      error: null,
    });
    fixture.detectChanges();

    expect(element.querySelectorAll('.sp__item')).toHaveLength(1);
    expect(TestBed.inject(SessionStore).session()).not.toBeNull();
  });

  it('encerrar a sessao atual descarta a sessao local', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.sp__btn')?.click();
    fixture.detectChanges();
    http.expectOne('/api/auth/sessions').flush({
      success: true,
      data: { sessions: [sessionRecord(CURRENT_ID, 'Chrome/120')] },
      error: null,
    });
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.sp__revoke')?.click();
    fixture.detectChanges();
    http.expectOne(`/api/auth/sessions/${CURRENT_ID}/revoke`).flush({
      success: true,
      data: { revoked: 1 },
      error: null,
    });

    expect(TestBed.inject(SessionStore).session()).toBeNull();
  });
});
