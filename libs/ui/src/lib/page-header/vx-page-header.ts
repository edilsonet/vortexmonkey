import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecalho de pagina do VORTEX: linha fina (eyebrow) + titulo + apoio, com
 * uma area de acoes projetada a direita.
 */
@Component({
  selector: 'vx-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hdr">
      <div class="hdr__text">
        @if (eyebrow()) {
          <p class="hdr__eyebrow">{{ eyebrow() }}</p>
        }
        <h1 class="hdr__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="hdr__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="hdr__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }
    .hdr {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--vx-space-4);
      flex-wrap: wrap;
      padding-bottom: var(--vx-space-4);
      border-bottom: 1px solid var(--vx-line);
      margin-bottom: var(--vx-space-5);
    }
    .hdr__eyebrow {
      margin: 0 0 var(--vx-space-1);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--vx-accent);
    }
    .hdr__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      color: var(--vx-text);
    }
    .hdr__subtitle {
      margin: var(--vx-space-1) 0 0;
      font-size: 0.875rem;
      color: var(--vx-text-muted);
      max-width: 60ch;
    }
    .hdr__actions {
      display: flex;
      align-items: center;
      gap: var(--vx-space-2);
    }
  `,
})
export class VxPageHeader {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
