import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CommunicationStore, VORTEX_CORE_CONFIG } from '@vortex/core';
import { CommunicationCenter } from './communication-center';

describe('CommunicationCenter', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunicationCenter],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: '/api' } },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(CommunicationCenter);
    fixture.detectChanges();
    return fixture;
  }

  it('exibe os modulos da Central e o controle de tema', () => {
    const element = render().nativeElement as HTMLElement;
    const labels = Array.from(element.querySelectorAll('.cc__btn')).map((button) =>
      button.textContent?.trim(),
    );
    expect(labels).toContain('Chat');
    expect(labels).toContain('Alertas');
    expect(labels).toContain('E-mails');
    expect(labels).toContain('Comunicados');
    expect(labels).toContain('Notificacoes');
    expect(labels.some((label) => label?.startsWith('Tema'))).toBe(true);
  });

  it('mostra o badge apenas quando o estado tem itens', () => {
    TestBed.inject(CommunicationStore).set({ alerts: 2 });
    const element = render().nativeElement as HTMLElement;
    expect(element.querySelector('.cc__badge')?.textContent?.trim()).toBe('2');
  });

  it('abre o painel do modulo e fecha no scrim', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.cc__panel')).toBeNull();

    const alerts = Array.from(element.querySelectorAll<HTMLButtonElement>('.cc__btn')).find(
      (button) => button.textContent?.includes('Alertas'),
    );
    alerts?.click();
    fixture.detectChanges();

    const panel = element.querySelector('.cc__panel');
    expect(panel?.querySelector('.cc__panelTitle')?.textContent?.trim()).toBe('Alertas');

    element.querySelector<HTMLButtonElement>('.cc__scrim')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.cc__panel')).toBeNull();
  });

  it('hidrata os badges do resumo e carrega os itens do modulo', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    http.expectOne('/api/communication/summary').flush({
      success: true,
      data: {
        counters: { chat: 2, alerts: 0, mail: 0, news: 0, notices: 0 },
        generatedAt: '2026-09-25T12:00:00.000Z',
      },
      error: null,
    });
    fixture.detectChanges();
    expect(element.querySelector('.cc__badge')?.textContent?.trim()).toBe('2');

    const chat = Array.from(element.querySelectorAll<HTMLButtonElement>('.cc__btn')).find(
      (button) => button.textContent?.includes('Chat'),
    );
    chat?.click();
    fixture.detectChanges();

    http.expectOne('/api/communication/conversations').flush({
      success: true,
      data: [
        {
          id: 'c1',
          companyId: null,
          topic: 'COMPANY',
          title: 'Oficina',
          status: 'OPEN',
          unreadCount: 2,
          messageCount: 2,
          lastMessageAt: '2026-09-25T12:00:00.000Z',
          lastMessagePreview: 'OS 42',
          createdAt: '2026-09-25T12:00:00.000Z',
          updatedAt: '2026-09-25T12:00:00.000Z',
        },
      ],
      error: null,
    });
    fixture.detectChanges();

    const items = Array.from(element.querySelectorAll('.cc__itemTitle')).map((node) =>
      node.textContent?.trim(),
    );
    expect(items).toEqual(['Oficina']);
  });

  it('carrega os avisos diretos no modulo de Notificacoes', () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    http.expectOne('/api/communication/summary').flush({
      success: true,
      data: {
        counters: { chat: 0, alerts: 0, mail: 0, news: 0, notices: 1 },
        generatedAt: '2026-09-25T12:00:00.000Z',
      },
      error: null,
    });
    fixture.detectChanges();

    const notices = Array.from(element.querySelectorAll<HTMLButtonElement>('.cc__btn')).find(
      (button) => button.textContent?.includes('Notificacoes'),
    );
    notices?.click();
    fixture.detectChanges();

    http.expectOne('/api/notifications').flush({
      success: true,
      data: {
        notifications: [
          {
            id: 'n1',
            tenantId: 't1',
            companyId: null,
            code: 'SESSION_REUSE_DETECTED',
            severity: 'CRITICAL',
            title: 'Sessao encerrada',
            body: 'Token reapresentado.',
            relatedEntityType: 'identity.session_family',
            relatedEntityId: 'f1',
            createdAt: '2026-09-25T12:00:00.000Z',
            readAt: null,
          },
        ],
      },
      error: null,
    });
    fixture.detectChanges();

    const items = Array.from(element.querySelectorAll('.cc__itemTitle')).map((node) =>
      node.textContent?.trim(),
    );
    expect(items).toEqual(['Sessao encerrada']);
  });
});
