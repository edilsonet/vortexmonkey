import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VORTEX_CORE_CONFIG } from '@vortex/core';
import { VortexShell } from './vortex-shell';

describe('VortexShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VortexShell],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VORTEX_CORE_CONFIG, useValue: { apiBaseUrl: '/api' } },
      ],
    }).compileComponents();
  });

  it('renderiza a navegacao declarada pelo hospedeiro', () => {
    const fixture = TestBed.createComponent(VortexShell);
    fixture.componentRef.setInput('nav', [
      { label: 'Conformidade', link: '/conformidade' },
      { label: 'Aeronaves', link: '/aeronaves' },
    ]);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.nav__link')).map((link) =>
      link.textContent?.trim(),
    );
    expect(links).toEqual(['Conformidade', 'Aeronaves']);
  });

  it('projeta o conteudo da rota na area principal', () => {
    const fixture = TestBed.createComponent(VortexShell);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.content')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('vx-communication-center')).toBeTruthy();
  });
});
