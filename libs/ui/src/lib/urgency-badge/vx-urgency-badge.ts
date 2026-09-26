import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Urgency } from '@vortex/shared-dto';

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'Vencido',
  due_soon: 'Vence logo',
  upcoming: 'Programado',
  none: 'Sem prazo',
};

/**
 * Selo de urgencia de conformidade. A cor segue a mesma semantica do Hub de
 * Alertas Preditivos (INFO/WARNING/CRITICAL/BLOCKING).
 */
@Component({
  selector: 'vx-urgency-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + urgency()" [attr.aria-label]="text()">
      <span class="badge__dot" aria-hidden="true"></span>
      {{ text() }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--vx-space-2);
      padding: 0.125rem var(--vx-space-3);
      border-radius: var(--vx-radius-pill);
      border: 1px solid currentColor;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      white-space: nowrap;
      color: var(--badge-fg);
      background: var(--badge-bg);
    }
    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: var(--vx-radius-pill);
      background: currentColor;
    }
    .badge--overdue {
      --badge-fg: var(--vx-overdue);
      --badge-bg: var(--vx-overdue-bg);
    }
    .badge--due_soon {
      --badge-fg: var(--vx-due-soon);
      --badge-bg: var(--vx-due-soon-bg);
    }
    .badge--upcoming {
      --badge-fg: var(--vx-upcoming);
      --badge-bg: var(--vx-upcoming-bg);
    }
    .badge--none {
      --badge-fg: var(--vx-none);
      --badge-bg: var(--vx-none-bg);
    }
  `,
})
export class VxUrgencyBadge {
  readonly urgency = input.required<Urgency>();
  /** Sobrescreve o rotulo padrao da urgencia. */
  readonly label = input<string>('');

  protected readonly text = computed(() => this.label() || URGENCY_LABEL[this.urgency()]);
}
