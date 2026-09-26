import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VxMetricTone = 'neutral' | 'accent' | 'ok' | 'warning' | 'critical';

/**
 * Leitura numerica de instrumento: rotulo, valor com numeros tabulares,
 * unidade e uma nota auxiliar. O tom tinge apenas a barra lateral e o valor,
 * nunca o fundo inteiro.
 */
@Component({
  selector: 'vx-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metric" [class]="'metric--' + tone()">
      <p class="metric__label">{{ label() }}</p>
      <p class="metric__value">
        {{ value() }}
        @if (unit()) {
          <span class="metric__unit">{{ unit() }}</span>
        }
      </p>
      @if (hint()) {
        <p class="metric__hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .metric {
      background: var(--vx-panel);
      border: 1px solid var(--vx-line);
      border-left: 3px solid var(--metric-accent, var(--vx-line-strong));
      border-radius: var(--vx-radius-md);
      padding: var(--vx-space-3) var(--vx-space-4);
      min-width: 0;
    }
    .metric--accent {
      --metric-accent: var(--vx-accent);
    }
    .metric--ok {
      --metric-accent: var(--vx-upcoming);
    }
    .metric--warning {
      --metric-accent: var(--vx-due-soon);
    }
    .metric--critical {
      --metric-accent: var(--vx-overdue);
    }
    .metric__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
    }
    .metric__value {
      margin: var(--vx-space-1) 0 0;
      font-family: var(--vx-font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.15;
      color: var(--metric-accent, var(--vx-text));
      overflow-wrap: anywhere;
    }
    .metric__unit {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--vx-text-muted);
      margin-left: 0.25em;
    }
    .metric__hint {
      margin: var(--vx-space-1) 0 0;
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
  `,
})
export class VxMetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>('');
  readonly hint = input<string>('');
  readonly tone = input<VxMetricTone>('neutral');
}
