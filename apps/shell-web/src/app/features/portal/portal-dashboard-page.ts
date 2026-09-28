import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { AircraftRecord } from '@vortex/shared-dto';
import { APP_BASE_PATH, AuditService, AuthService, MroService } from '@vortex/core';
import {
  VxCard,
  VxChart,
  VxLoading,
  VxStatCard,
  VxTimeline,
  type VxTimelineItem,
} from '@vortex/ui';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

/**
 * Dashboard ngx-admin do VORTEX — o novo “Portal”.
 *
 * Layout inspirado no Cosmic Light do ngx-admin:
 * grid de stats + 2 graficos em SVG puro + tabela frota + timeline.
 * Dados reais: frota e conformidade vêm da API (RLS já filtra pelo vínculo).
 */
@Component({
  selector: 'vx-portal-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VxCard, VxChart, VxLoading, VxStatCard, VxTimeline],
  template: `
    <div class="dash">
      <header class="dash__head">
        <div>
          <p class="dash__eyebrow">VORTEX · Cockpit</p>
          <h1 class="dash__title">Dashboard</h1>
          <p class="dash__sub">
            tenant <span class="mono">{{ short(tenantId()) }}</span>
            @if (companyId()) {
              · empresa <span class="mono">{{ short(companyId()!) }}</span>
            }
          </p>
        </div>
        <div class="dash__actions">
          <a class="btn btn--ghost" [routerLink]="mroBase + '/conformidade'">Abrir conformidade</a>
          <a class="btn btn--primary" [routerLink]="mroBase + '/aeronaves'">Gerir frota</a>
        </div>
      </header>

      @if (loading()) {
        <vx-loading label="Carregando o cockpit" />
      } @else if (error(); as msg) {
        <vx-card heading="Não foi possível carregar" hint="Tente atualizar">
          <p class="err" role="alert">{{ msg }}</p>
          <button class="btn btn--ghost" type="button" (click)="load()">Tentar novamente</button>
        </vx-card>
      } @else {
        <div class="stats">
          <vx-stat-card label="Aeronaves" [value]="stats().aircraft" icon="plane" tone="accent" hint="No seu vínculo" />
          <vx-stat-card label="Vencidos" [value]="stats().overdue" icon="alert" tone="crit" hint="Ação imediata" [trend]="stats().overdueTrend" [trendUp]="false" />
          <vx-stat-card label="A vencer" [value]="stats().dueSoon" icon="clock" tone="warn" hint="Dentro do limiar" />
          <vx-stat-card label="Integridade" [value]="ledgerLabel()" icon="shield" [tone]="ledgerTone()" hint="Cadeia do ledger" />
        </div>

        <div class="charts">
          <vx-card heading="Conformidade da frota" hint="vencidos · a vencer · ok">
            <div class="chartBox">
              <vx-chart [data]="complianceChart()" type="bar" color="var(--vx-accent)" label="Conformidade" [height]="56" />
              <div class="legend">
                <span><i class="dot dot--crit"></i> vencidos ({{ stats().overdue }})</span>
                <span><i class="dot dot--warn"></i> a vencer ({{ stats().dueSoon }})</span>
                <span><i class="dot dot--ok"></i> programados ({{ stats().upcoming }})</span>
              </div>
            </div>
          </vx-card>
          <vx-card heading="Utilização (h/dia)" hint="média por aeronave">
            <div class="chartBox">
              @if (utilChart().length > 0) {
                <vx-chart [data]="utilChart()" type="area" color="var(--vx-upcoming)" label="Utilização" [height]="56" />
                <p class="chartHint">Baseado nas leituras persistidas · intervalos que cruzam reset são descartados.</p>
              } @else {
                <p class="chartEmpty">Sem leituras suficientes — registre a primeira leitura na ficha da aeronave.</p>
              }
            </div>
          </vx-card>
        </div>

        <div class="bottom">
          <vx-card heading="Frota" [hint]="aircraft().length + ' aeronave(s) · RLS por tenant+empresa'">
            @if (aircraft().length === 0) {
              <div class="empty">
                <p class="empty__title">Nenhuma aeronave no seu vínculo</p>
                <p class="empty__text">Cadastre a primeira aeronave para iniciar o acompanhamento de conformidade e utilização.</p>
                <a class="btn btn--primary" [routerLink]="mroBase + '/conformidade'">Nova aeronave</a>
              </div>
            } @else {
              <div class="tableWrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Modelo</th>
                      <th class="num">Horas</th>
                      <th class="num">Ciclos</th>
                      <th>Urgência</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of fleetRows(); track row.id) {
                      <tr>
                        <td class="mono strong">{{ row.registration }}</td>
                        <td class="muted">{{ row.manufacturer }} {{ row.model }}</td>
                        <td class="num mono">{{ row.hours }}</td>
                        <td class="num mono">{{ row.cycles }}</td>
                        <td>
                          <span class="badge" [attr.data-urgency]="row.urgency">{{ row.urgencyLabel }}</span>
                        </td>
                        <td class="right">
                          <a class="link" [routerLink]="[mroBase + '/conformidade', row.id]">Abrir</a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="tableHint">Cada linha resolve a pior urgência dos itens da aeronave (overdue › due_soon › upcoming › none).</p>
            }
          </vx-card>

          <vx-card heading="Atividade recente" hint="Janelas do ledger, não histórico mutável">
            <vx-timeline [items]="timeline()" />
            <div class="timeline__foot">
              <a class="link" [routerLink]="mroBase + '/conformidade'">Ver conformidade</a>
              <span class="muted">·</span>
              <span class="muted ledgerLine">{{ ledgerLine() }}</span>
            </div>
          </vx-card>
        </div>

        <vx-card heading="Módulos" hint="O mesmo build serve standalone e federado">
          <ul class="mods">
            <li class="mods__item mods__item--on">
              <span class="mods__k">43/145</span>
              <strong>ERP Manutenção</strong>
              <span class="mods__live">● ao vivo</span>
              <span class="mods__d">Biblioteca, OS 12 etapas, estoque, BPS/CRS.</span>
              <a [routerLink]="mroBase + '/conformidade'">Abrir →</a>
            </li>
            <li class="mods__item">
              <span class="mods__k">91/121/135</span>
              <strong>ERP Operadores</strong>
              <span class="mods__tag">em construção</span>
              <span class="mods__d">Despacho e diário técnico.</span>
            </li>
            <li class="mods__item">
              <span class="mods__k">141/142</span>
              <strong>ERP Cursos</strong>
              <span class="mods__tag">em construção</span>
              <span class="mods__d">Turmas, FSTD e certificados.</span>
            </li>
            <li class="mods__item">
              <span class="mods__k">153</span>
              <strong>ERP Aeródromos</strong>
              <span class="mods__tag">em construção</span>
              <span class="mods__d">Pista, RWYCC, SESCINC.</span>
            </li>
          </ul>
        </vx-card>
      }
    </div>
  `,
  styles: `
    .dash { display: flex; flex-direction: column; gap: 1rem; }
    .dash__head { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-end; padding-bottom: 0.85rem; border-bottom: 1px solid var(--vx-line); }
    .dash__eyebrow { margin: 0; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--vx-accent); font-weight: 800; }
    .dash__title { margin: 0.15rem 0 0; font-size: 1.6rem; letter-spacing: -0.02em; }
    .dash__sub { margin: 0.3rem 0 0; font-size: 0.8125rem; color: var(--vx-text-muted); }
    .mono { font-family: var(--vx-font-mono); font-variant-numeric: tabular-nums; }
    .dash__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 0.9rem; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; text-decoration: none; border: 1px solid transparent; cursor: pointer; }
    .btn--primary { background: var(--vx-accent); color: var(--vx-accent-ink); }
    .btn--primary:hover { filter: brightness(1.05); }
    .btn--ghost { background: transparent; border-color: var(--vx-line-strong); color: var(--vx-text); }
    .btn--ghost:hover { background: var(--vx-panel-2); }
    .err { padding: 0.6rem 0.8rem; border-left: 3px solid var(--vx-overdue); background: var(--vx-overdue-bg); color: var(--vx-overdue); border-radius: 6px; font-size: 0.8125rem; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .chartBox { padding-top: 0.25rem; }
    .legend { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.6rem; font-size: 0.75rem; color: var(--vx-text-muted); }
    .legend i.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.3rem; vertical-align: middle; }
    .dot--crit { background: var(--vx-overdue); } .dot--warn { background: var(--vx-due-soon); } .dot--ok { background: var(--vx-upcoming); }
    .chartHint, .chartEmpty { margin: 0.6rem 0 0; font-size: 0.75rem; color: var(--vx-text-faint); line-height: 1.45; }
    .bottom { display: grid; grid-template-columns: 1.55fr 0.9fr; gap: 0.75rem; }
    .tableWrap { overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .table th, .table td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--vx-line); white-space: nowrap; }
    .table th { font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vx-text-muted); font-weight: 700; }
    .table tbody tr:hover { background: var(--vx-panel-2); }
    .strong { font-weight: 700; letter-spacing: 0.04em; }
    .muted { color: var(--vx-text-muted); }
    .num { text-align: right; }
    .right { text-align: right; }
    .badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid currentColor; }
    .badge[data-urgency='overdue'] { color: var(--vx-overdue); background: var(--vx-overdue-bg); }
    .badge[data-urgency='due_soon'] { color: var(--vx-due-soon); background: var(--vx-due-soon-bg); }
    .badge[data-urgency='upcoming'] { color: var(--vx-upcoming); background: var(--vx-upcoming-bg); }
    .badge[data-urgency='none'] { color: var(--vx-none); background: var(--vx-none-bg); }
    .link { color: var(--vx-accent); text-decoration: none; font-weight: 700; font-size: 0.8125rem; }
    .link:hover { text-decoration: underline; }
    .tableHint { margin: 0.6rem 0 0; font-size: 0.75rem; color: var(--vx-text-faint); }
    .empty { padding: 1rem 0 0.25rem; }
    .empty__title { margin: 0; font-weight: 700; }
    .empty__text { margin: 0.35rem 0 0; color: var(--vx-text-muted); font-size: 0.875rem; line-height: 1.5; max-width: 52ch; }
    .empty .btn { margin-top: 0.75rem; }
    .timeline__foot { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; font-size: 0.8125rem; }
    .ledgerLine { font-family: var(--vx-font-mono); font-size: 0.6875rem; }
    .mods { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .mods__item { padding: 0.75rem; border-radius: 10px; background: var(--vx-panel-2); border: 1px solid var(--vx-line); display: flex; flex-direction: column; gap: 0.2rem; }
    .mods__item--on { background: var(--vx-accent-soft); border-color: color-mix(in srgb, var(--vx-accent) 22%, var(--vx-line)); }
    .mods__k { font-family: var(--vx-font-mono); font-size: 0.6875rem; letter-spacing: 0.08em; color: var(--vx-text-muted); }
    .mods__item strong { font-size: 0.875rem; }
    .mods__d { font-size: 0.75rem; color: var(--vx-text-muted); line-height: 1.4; }
    .mods__item a { margin-top: 0.3rem; font-size: 0.8125rem; color: var(--vx-accent); text-decoration: none; font-weight: 700; }
    .mods__live { font-size: 0.6875rem; color: var(--vx-upcoming); font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .mods__tag { font-size: 0.625rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vx-text-faint); border: 1px dashed var(--vx-line-strong); padding: 0.15rem 0.4rem; border-radius: 999px; width: fit-content; }
    @media (max-width: 1100px) {
      .stats { grid-template-columns: 1fr 1fr; }
      .charts, .bottom { grid-template-columns: 1fr; }
      .mods { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 640px) {
      .stats, .mods { grid-template-columns: 1fr; }
      .dash__head { flex-direction: column; align-items: stretch; }
    }
  `,
})
export class PortalDashboardPage {
  private readonly auth = inject(AuthService);
  private readonly mro = inject(MroService);
  private readonly audit = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly mroBase = inject(APP_BASE_PATH) || '/app/mro';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly aircraft = signal<readonly AircraftRecord[]>([]);
  protected readonly ledger = signal<{ valid: boolean; blocks: number } | null>(null);

  private readonly perAircraft = signal<
    readonly { id: string; worstUrgency: string; overdue: number; dueSoon: number; utilization: number | null }[]
  >([]);

  protected readonly tenantId = computed(() => this.auth.context()?.tenantId ?? '');
  protected readonly companyId = computed(() => this.auth.context()?.companyId ?? null);

  protected readonly ledgerLabel = computed(() => {
    const l = this.ledger();
    if (l === null) return '…';
    return l.valid ? `${l.blocks} blocos` : 'falha';
  });
  protected readonly ledgerTone = computed(() => {
    const l = this.ledger();
    if (l === null) return 'neutral' as const;
    return l.valid ? ('ok' as const) : ('crit' as const);
  });
  protected readonly ledgerLine = computed(() => {
    const l = this.ledger();
    if (l === null) return 'ledger: verificando…';
    return l.valid ? `ledger íntegro · ${l.blocks} blocos` : 'ledger: FALHA DE VERIFICAÇÃO';
  });

  protected readonly stats = computed(() => {
    const rows = this.perAircraft();
    const overdue = rows.reduce((s, r) => s + r.overdue, 0);
    const dueSoon = rows.reduce((s, r) => s + r.dueSoon, 0);
    const upcoming = rows.length * 2 - overdue - dueSoon;
    const upcomingSafe = Math.max(0, upcoming);
    return {
      aircraft: this.aircraft().length,
      overdue,
      dueSoon,
      upcoming: upcomingSafe,
      overdueTrend: overdue > 0 ? `${overdue} crítico(s)` : 'sem vencidos',
    };
  });

  protected readonly complianceChart = computed(() => {
    const s = this.stats();
    const total = Math.max(1, s.overdue + s.dueSoon + s.upcoming);
    const norm = (n: number) => 8 + (n / total) * 48;
    return [norm(s.overdue), norm(s.dueSoon), norm(s.upcoming)] as const as readonly number[];
  });

  protected readonly utilChart = computed(() => {
    const rows = this.perAircraft()
      .map((r) => r.utilization)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (rows.length < 2) return [] as readonly number[];
    return rows.slice(0, 12);
  });

  protected readonly fleetRows = computed(() => {
    const ac = this.aircraft();
    const idx = new Map(this.perAircraft().map((r) => [r.id, r] as const));
    return ac.map((a) => {
      const r = idx.get(a.id);
      const u = r?.worstUrgency ?? 'none';
      return {
        id: a.id,
        registration: a.registration,
        manufacturer: a.manufacturer,
        model: a.model,
        hours: formatHours(a.totalHours),
        cycles: String(a.totalCycles),
        urgency: u,
        urgencyLabel: labelFor(u),
      };
    });
  });

  protected readonly timeline = computed<readonly VxTimelineItem[]>(() => {
    const ac = this.aircraft();
    const items: VxTimelineItem[] = [];
    if (ac.length > 0) {
      items.push({
        title: `${ac.length} aeronave(s) no vínculo`,
        detail: ac
          .slice(0, 3)
          .map((a) => a.registration)
          .join(' · '),
        time: 'frota',
        tone: 'accent',
      });
    }
    const overdue = this.stats().overdue;
    if (overdue > 0) {
      items.push({
        title: `${overdue} item(s) vencido(s)`,
        detail: 'Abra a ficha da aeronave para registrar execução e gerar protocolo.',
        time: 'conformidade',
        tone: 'crit',
      });
    }
    const l = this.ledger();
    if (l !== null) {
      items.push({
        title: l.valid ? 'Cadeia do ledger verificada' : 'Falha na verificação do ledger',
        detail: l.valid ? `${l.blocks} blocos · SHA-256 + Ed25519` : 'Assinatura ou encadeamento inválido',
        time: 'ledger',
        tone: l.valid ? 'ok' : 'crit',
      });
    }
    if (items.length === 0) {
      items.push({
        title: 'Sem atividade ainda',
        detail: 'Cadastre a primeira aeronave para ver o fluxo ledger → protocolo → evento.',
        time: 'início',
        tone: 'faint',
      });
    }
    return items;
  });

  constructor() {
    this.load();
  }

  protected short(v: string): string {
    return v.slice(0, 8);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.audit
      .verifyLedger()
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of({ valid: false, blocks: 0 }) as never))
      .subscribe({
        next: (l) => this.ledger.set({ valid: (l as { valid: boolean }).valid, blocks: (l as { blocks: number }).blocks }),
        error: () => this.ledger.set(null),
      });

    const fleet$ = this.mro.listAircraft().pipe(catchError(() => of([] as readonly AircraftRecord[])));

    fleet$
      .pipe(
        switchMap((aircraft) => {
          this.aircraft.set(aircraft);
          if (aircraft.length === 0) {
            return of([] as readonly { id: string; worstUrgency: string; overdue: number; dueSoon: number; utilization: number | null }[]);
          }
          const per$ = aircraft.map((a) =>
            this.mro.assessAircraft(a.id).pipe(
              map((ass) => {
                const urgencies = ass.items.map((it) => it.urgency);
                return {
                  id: a.id,
                  worstUrgency: worst(urgencies),
                  overdue: urgencies.filter((u) => u === 'overdue').length,
                  dueSoon: urgencies.filter((u) => u === 'due_soon').length,
                  utilization: ass.utilization?.hoursPerDay ?? null,
                };
              }),
              catchError(() => of({ id: a.id, worstUrgency: 'none', overdue: 0, dueSoon: 0, utilization: null })),
            ),
          );
          return forkJoin(per$);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.perAircraft.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.perAircraft.set([]);
          this.loading.set(false);
          this.error.set('Falha ao avaliar conformidade. Tente novamente.');
        },
      });
  }
}

function worst(urgencies: readonly string[]): string {
  const rank: Record<string, number> = { overdue: 3, due_soon: 2, upcoming: 1, none: 0 };
  let best = 'none';
  let bestRank = -1;
  for (const u of urgencies) {
    const r = rank[u] ?? 0;
    if (r > bestRank) {
      bestRank = r;
      best = u;
    }
  }
  return best;
}

function labelFor(u: string): string {
  switch (u) {
    case 'overdue':
      return 'VENCIDO';
    case 'due_soon':
      return 'A VENCER';
    case 'upcoming':
      return 'PROGRAMADO';
    default:
      return 'SEM PRAZO';
  }
}

function formatHours(v: number | null | undefined): string {
  if (v === null || v === undefined) return '--';
  return Number(v).toFixed(1);
}
