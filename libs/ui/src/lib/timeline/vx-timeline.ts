import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface VxTimelineItem {
  readonly title: string;
  readonly detail?: string | null;
  readonly time?: string | null;
  readonly tone?: 'accent' | 'ok' | 'warn' | 'crit' | 'faint';
}

/**
 * Linha do tempo vertical — usada no dashboard para “atividade recente”.
 * Dot + riser + cartão minimalista.
 */
@Component({
  selector: 'vx-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="tl">
      @for (item of items(); track $index) {
        <li class="tl__row" [attr.data-tone]="item.tone ?? 'faint'">
          <span class="tl__dot" aria-hidden="true"></span>
          <span class="tl__line" aria-hidden="true"></span>
          <div class="tl__card">
            <span class="tl__title">{{ item.title }}</span>
            @if (item.detail) {
              <span class="tl__detail">{{ item.detail }}</span>
            }
            @if (item.time) {
              <span class="tl__time">{{ item.time }}</span>
            }
          </div>
        </li>
      }
      @if (items().length === 0) {
        <li class="tl__empty">Nenhuma atividade ainda.</li>
      }
    </ol>
  `,
  styles: `
    :host { display: block; }
    .tl { list-style: none; margin: 0; padding: 0; }
    .tl__row { position: relative; display: flex; gap: 0.75rem; padding: 0 0 0.9rem 1.1rem; }
    .tl__row:last-child { padding-bottom: 0; }
    .tl__row:last-child .tl__line { display: none; }
    .tl__dot {
      position: absolute; left: 0; top: 0.35rem; width: 9px; height: 9px; border-radius: 50%;
      background: var(--dot, var(--vx-line-strong));
      box-shadow: 0 0 0 5px color-mix(in srgb, var(--dot, var(--vx-line-strong)) 14%, transparent);
    }
    .tl__row[data-tone='accent'] { --dot: var(--vx-accent); }
    .tl__row[data-tone='ok'] { --dot: var(--vx-upcoming); }
    .tl__row[data-tone='warn'] { --dot: var(--vx-due-soon); }
    .tl__row[data-tone='crit'] { --dot: var(--vx-overdue); }
    .tl__row[data-tone='faint'] { --dot: var(--vx-line-strong); }
    .tl__line { position: absolute; left: 4px; top: 0.9rem; bottom: -0.1rem; width: 1px; background: var(--vx-line); }
    .tl__card { flex: 1; min-width: 0; padding: 0.6rem 0.7rem; border-radius: 9px; background: var(--vx-panel-2); border: 1px solid var(--vx-line); }
    .tl__title { display: block; font-size: 0.8125rem; font-weight: 600; }
    .tl__detail { display: block; font-size: 0.75rem; color: var(--vx-text-muted); margin-top: 0.15rem; line-height: 1.45; }
    .tl__time { display: block; font-size: 0.6875rem; color: var(--vx-text-faint); margin-top: 0.25rem; font-family: var(--vx-font-mono); }
    .tl__empty { padding: 0.75rem; text-align: center; color: var(--vx-text-faint); font-size: 0.8125rem; border: 1px dashed var(--vx-line); border-radius: 9px; }
  `,
})
export class VxTimeline {
  readonly items = input.required<readonly VxTimelineItem[]>();
}
