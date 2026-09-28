import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VxStatTone = 'accent' | 'ok' | 'warn' | 'crit' | 'neutral';

/**
 * Cartão de métrica “cosmic”: ícone à esquerda, valor grande tabular,
 * subtítulo e optional tendência. Usado no dashboard ngx-admin da Shell.
 */
@Component({
  selector: 'vx-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat" [attr.data-tone]="tone()">
      <span class="stat__icon" aria-hidden="true">
        @switch (icon()) {
          @case ('plane') {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M2 12l10-8 10 8-10 4-5-2 5-4" /><path d="M12 16v4" />
            </svg>
          }
          @case ('alert') {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 3l9 16H3L12 3z" /><path d="M12 9v6M12 17h.01" />
            </svg>
          }
          @case ('clock') {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>
            </svg>
          }
          @case ('shield') {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 3l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          }
          @case ('layers') {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 3L3 9l9 6 9-6-9-6z"/><path d="M3 15l9 6 9-6"/>
            </svg>
          }
          @default {
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7">
              <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8M12 8v8"/>
            </svg>
          }
        }
      </span>
      <div class="stat__body">
        <span class="stat__label">{{ label() }}</span>
        <span class="stat__value">
          {{ value() }}
          @if (unit()) {
            <small>{{ unit() }}</small>
          }
        </span>
        @if (hint()) {
          <span class="stat__hint">{{ hint() }}</span>
        }
      </div>
      @if (trend()) {
        <span class="stat__trend" [class.stat__trend--up]="trendUp()" [class.stat__trend--down]="!trendUp()">
          {{ trend() }}
        </span>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .stat {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.9rem 1rem; border-radius: 12px;
      background: var(--vx-panel); border: 1px solid var(--vx-line);
      border-left: 3px solid var(--stat-accent, var(--vx-line-strong));
      box-shadow: var(--vx-shadow-1);
      min-width: 0;
    }
    .stat[data-tone='accent'] { --stat-accent: var(--vx-accent); }
    .stat[data-tone='ok'] { --stat-accent: var(--vx-upcoming); }
    .stat[data-tone='warn'] { --stat-accent: var(--vx-due-soon); }
    .stat[data-tone='crit'] { --stat-accent: var(--vx-overdue); }
    .stat__icon {
      display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px;
      background: color-mix(in srgb, var(--stat-accent, var(--vx-line-strong)) 14%, transparent);
      color: var(--stat-accent, var(--vx-text-muted));
      border: 1px solid color-mix(in srgb, var(--stat-accent, var(--vx-line-strong)) 18%, transparent);
      flex: 0 0 auto;
    }
    .stat__body { display: flex; flex-direction: column; min-width: 0; }
    .stat__label { font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vx-text-muted); font-weight: 600; }
    .stat__value { font-family: var(--vx-font-mono); font-variant-numeric: tabular-nums; font-size: 1.35rem; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
    .stat__value small { font-size: 0.75rem; font-weight: 500; color: var(--vx-text-muted); margin-left: 0.2em; }
    .stat__hint { font-size: 0.75rem; color: var(--vx-text-faint); margin-top: 0.1rem; }
    .stat__trend { margin-left: auto; font-size: 0.6875rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 999px; border: 1px solid currentColor; font-family: var(--vx-font-mono); }
    .stat__trend--up { color: var(--vx-upcoming); background: var(--vx-upcoming-bg); }
    .stat__trend--down { color: var(--vx-overdue); background: var(--vx-overdue-bg); }
  `,
})
export class VxStatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>('');
  readonly hint = input<string>('');
  readonly tone = input<VxStatTone>('neutral');
  readonly icon = input<'plane' | 'alert' | 'clock' | 'shield' | 'layers' | 'grid'>('grid');
  readonly trend = input<string>('');
  readonly trendUp = input<boolean>(true);
}
