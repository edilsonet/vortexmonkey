import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Estado vazio do DS, com acao projetada opcional. */
@Component({
  selector: 'vx-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <p class="empty__title">{{ title() }}</p>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__action">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .empty {
      text-align: center;
      padding: var(--vx-space-6) var(--vx-space-4);
      border: 1px dashed var(--vx-line-strong);
      border-radius: var(--vx-radius-lg);
      background: var(--vx-panel-2);
    }
    .empty__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--vx-text);
    }
    .empty__message {
      margin: var(--vx-space-2) auto 0;
      max-width: 46ch;
      font-size: 0.875rem;
      color: var(--vx-text-muted);
    }
    .empty__action {
      margin-top: var(--vx-space-4);
    }
  `,
})
export class VxEmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
