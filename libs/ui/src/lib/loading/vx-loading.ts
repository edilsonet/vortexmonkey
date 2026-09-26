import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicador de carga em bloco, com rotulo acessivel. */
@Component({
  selector: 'vx-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status" [attr.aria-label]="label()">
      <span class="loading__bar" aria-hidden="true"></span>
      <span class="loading__label">{{ label() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: var(--vx-space-3);
      padding: var(--vx-space-4);
      color: var(--vx-text-muted);
      font-size: 0.875rem;
    }
    .loading__bar {
      position: relative;
      width: 60px;
      height: 3px;
      border-radius: var(--vx-radius-pill);
      background: var(--vx-line);
      overflow: hidden;
    }
    .loading__bar::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 40%;
      border-radius: inherit;
      background: var(--vx-accent);
      animation: vx-slide 1.1s ease-in-out infinite;
    }
    @keyframes vx-slide {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(250%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading__bar::after {
        animation: none;
        width: 100%;
      }
    }
  `,
})
export class VxLoading {
  readonly label = input<string>('Carregando');
}
