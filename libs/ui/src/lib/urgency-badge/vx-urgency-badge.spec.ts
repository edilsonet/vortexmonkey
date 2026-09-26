import { TestBed } from '@angular/core/testing';
import type { Urgency } from '@vortex/shared-dto';
import { VxUrgencyBadge } from './vx-urgency-badge';

describe('VxUrgencyBadge', () => {
  function render(urgency: Urgency, label?: string): string {
    const fixture = TestBed.createComponent(VxUrgencyBadge);
    fixture.componentRef.setInput('urgency', urgency);
    if (label !== undefined) {
      fixture.componentRef.setInput('label', label);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VxUrgencyBadge] }).compileComponents();
  });

  it('usa o rotulo padrao de cada urgencia', () => {
    expect(render('overdue')).toContain('Vencido');
    expect(render('due_soon')).toContain('Vence logo');
    expect(render('upcoming')).toContain('Programado');
    expect(render('none')).toContain('Sem prazo');
  });

  it('aceita rotulo sobrescrito', () => {
    expect(render('overdue', 'Critico')).toContain('Critico');
  });
});
