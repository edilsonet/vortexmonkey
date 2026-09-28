import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Mini chart puro em SVG — sem dependência. Aceita área suave ou barras,
 * tem preenchimento em degradê e números tabulares. É o gráfico “cosmic”
 * usado no dashboard da Shell.
 */
@Component({
  selector: 'vx-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (type() === 'bar') {
      <svg [attr.viewBox]="'0 0 100 ' + height()" preserveAspectRatio="none" role="img" [attr.aria-label]="label()">
        <defs>
          <linearGradient [attr.id]="gradId()" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.9" />
            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0.15" />
          </linearGradient>
        </defs>
        @for (entry of bars(); track $index) {
          <rect
            [attr.x]="entry.x"
            [attr.y]="entry.y"
            [attr.width]="entry.w"
            [attr.height]="entry.h"
            rx="2"
            [attr.fill]="'url(#' + gradId() + ')'"
            [attr.stroke]="color()"
            stroke-opacity="0.35"
          />
        }
      </svg>
    } @else {
      <svg [attr.viewBox]="'0 0 100 ' + height()" preserveAspectRatio="none" role="img" [attr.aria-label]="label()">
        <defs>
          <linearGradient [attr.id]="gradId()" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.28" />
            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0" />
          </linearGradient>
        </defs>
        @if (areaPath(); as area) {
          <path [attr.d]="area" [attr.fill]="'url(#' + gradId() + ')'" />
        }
        @if (linePath(); as line) {
          <path [attr.d]="line" fill="none" [attr.stroke]="color()" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        }
        @for (dot of dots(); track $index) {
          <circle [attr.cx]="dot.x" [attr.cy]="dot.y" r="1.8" [attr.fill]="color()" stroke="white" stroke-width="0.7" />
        }
      </svg>
    }
  `,
  styles: `
    :host { display: block; }
    svg { display: block; width: 100%; height: auto; }
  `,
})
export class VxChart {
  readonly data = input.required<readonly number[]>();
  readonly type = input<'area' | 'bar'>('area');
  readonly color = input<string>('var(--vx-accent)');
  readonly label = input<string>('Gráfico');
  readonly height = input<number>(44);

  private readonly seed = Math.random().toString(36).slice(2, 7);
  protected readonly gradId = computed(() => `vx-grad-${this.seed}`);

  protected readonly linePath = computed(() => {
    const d = this.data();
    if (d.length === 0) return '';
    const h = this.height();
    const pad = 4;
    const inner = h - pad * 2;
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || 1;
    const step = 100 / Math.max(1, d.length - 1);
    const pts = d.map((v, i) => {
      const x = i * step;
      const y = h - pad - ((v - min) / range) * inner;
      return [x, y] as const;
    });
    const first = pts[0];
    if (first === undefined) return '';
    let out = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      if (p0 === undefined || p1 === undefined) continue;
      const mx = (p0[0] + p1[0]) / 2;
      out += ` C ${mx.toFixed(2)} ${p0[1].toFixed(2)}, ${mx.toFixed(2)} ${p1[1].toFixed(2)}, ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
    }
    return out;
  });

  protected readonly areaPath = computed(() => {
    const line = this.linePath();
    if (!line) return '';
    const d = this.data();
    const h = this.height();
    const lastX = d.length <= 1 ? 100 : 100;
    const firstX = 0;
    return `${line} L ${lastX} ${h} L ${firstX} ${h} Z`;
  });

  protected readonly dots = computed(() => {
    const d = this.data();
    if (d.length === 0 || d.length > 18) return [] as readonly { x: number; y: number }[];
    const h = this.height();
    const pad = 4;
    const inner = h - pad * 2;
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || 1;
    const step = 100 / Math.max(1, d.length - 1);
    return d.map((v, i) => ({
      x: i * step,
      y: h - pad - ((v - min) / range) * inner,
    }));
  });

  protected readonly bars = computed(() => {
    const d = this.data();
    if (d.length === 0) return [] as readonly { x: number; y: number; w: number; h: number }[];
    const h = this.height();
    const pad = 3;
    const inner = h - pad * 2;
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || Math.max(1, max);
    const gap = 2;
    const w = (100 - gap * (d.length - 1)) / d.length;
    return d.map((v, i) => {
      const bh = ((v - min) / range) * inner;
      const bhSafe = Number.isFinite(bh) ? bh : 0;
      const heightBar = Math.max(2, bhSafe);
      return {
        x: i * (w + gap),
        y: h - pad - heightBar,
        w,
        h: heightBar,
      };
    });
  });
}
