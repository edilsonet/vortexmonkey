import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Superficie do DS. `heading`/`hint` opcionais alimentam o cabecalho; o corpo
 * recebe o conteudo projetado.
 */
@Component({
  selector: 'vx-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      @if (heading()) {
        <header class="card__head">
          <h2 class="card__title">{{ heading() }}</h2>
          @if (hint()) {
            <span class="card__hint">{{ hint() }}</span>
          }
        </header>
      }
      <div class="card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      background: var(--vx-panel);
      border: 1px solid var(--vx-line);
      border-radius: var(--vx-radius-lg);
      box-shadow: var(--vx-shadow-1);
      overflow: hidden;
    }
    .card__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--vx-space-3);
      padding: var(--vx-space-3) var(--vx-space-4);
      border-bottom: 1px solid var(--vx-line);
      background: var(--vx-panel-2);
    }
    .card__title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 650;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
    }
    .card__hint {
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
    .card__body {
      padding: var(--vx-space-4);
    }
  `,
})
export class VxCard {
  readonly heading = input<string>('');
  readonly hint = input<string>('');
}
