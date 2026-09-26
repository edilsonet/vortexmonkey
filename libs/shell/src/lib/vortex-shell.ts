import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditService, AuthService } from '@vortex/core';
import { CommunicationCenter } from './communication-center';
import { SessionPanel } from './session-panel';

/** Item da navegacao principal do app hospedeiro. */
export interface ShellNavLink {
  readonly label: string;
  readonly link: string;
  readonly exact?: boolean;
}

/**
 * Chrome compartilhado do VORTEX: marca, navegacao, Central de Comunicacao,
 * contexto do vinculo, tema e rodape com a prova regulatoria. Vive em
 * `@vortex/shell` para que host e MFEs rendam exatamente o mesmo quadro.
 *
 * O conteudo projetado (`<ng-content>`) recebe a saida de rota; a navegacao e
 * declarada pelo hospedeiro via `nav`, porque cada app tem o seu dominio.
 */
@Component({
  selector: 'vx-vortex-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, CommunicationCenter, SessionPanel],
  template: `
    <div class="shell">
      <header class="top">
        <a class="brand" [routerLink]="brandLink()">
          <span class="brand__mark">VX</span>
          <span class="brand__text">
            <strong>VORTEX</strong>
            @if (subtitle(); as sub) {
              <small>{{ sub }}</small>
            }
          </span>
        </a>

        <nav class="nav" [attr.aria-label]="navLabel()">
          @for (item of nav(); track item.link) {
            <a
              class="nav__link"
              [routerLink]="item.link"
              routerLinkActive="nav__link--on"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              >{{ item.label }}</a
            >
          }
        </nav>

        <span class="spacer"></span>

        <vx-communication-center />
        <vx-session-panel />

        @if (context(); as ctx) {
          <span class="ctx" [title]="ctx.tenantId">tenant {{ short(ctx.tenantId) }}</span>
          @if (ctx.companyId) {
            <span class="ctx" [title]="ctx.companyId">empresa {{ short(ctx.companyId) }}</span>
          }
        }

        <button class="ghost ghost--strong" type="button" (click)="logout()">Sair</button>
      </header>

      <main class="content">
        <ng-content />
      </main>

      <footer class="foot">
        <span>Resolu&ccedil;&atilde;o ANAC 458/2017 &middot; 520/2019 &middot; Lei 14.063/2020</span>
        <span class="foot__ledger" [class.foot__ledger--bad]="ledgerBroken()">
          {{ ledgerLabel() }}
        </span>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
    .shell {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
    }
    .top {
      display: flex;
      align-items: center;
      gap: var(--vx-space-4);
      padding: var(--vx-space-3) var(--vx-space-5);
      background: var(--vx-panel);
      border-bottom: 1px solid var(--vx-line);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-wrap: wrap;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--vx-space-3);
      text-decoration: none;
      color: inherit;
    }
    .brand__mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: var(--vx-radius-sm);
      background: var(--vx-accent);
      color: var(--vx-accent-ink);
      font-family: var(--vx-font-mono);
      font-weight: 700;
      font-size: 0.8125rem;
      letter-spacing: 0.04em;
    }
    .brand__text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }
    .brand__text strong {
      font-size: 0.9375rem;
      letter-spacing: 0.08em;
    }
    .brand__text small {
      font-size: 0.6875rem;
      color: var(--vx-text-muted);
    }
    .nav {
      display: flex;
      gap: var(--vx-space-1);
    }
    .nav__link {
      padding: var(--vx-space-2) var(--vx-space-3);
      border-radius: var(--vx-radius-sm);
      text-decoration: none;
      color: var(--vx-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
    }
    .nav__link:hover {
      background: var(--vx-panel-2);
      color: var(--vx-text);
    }
    .nav__link--on {
      background: var(--vx-accent-soft);
      color: var(--vx-accent);
      font-weight: 600;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .ctx {
      padding: 0.125rem var(--vx-space-2);
      border: 1px solid var(--vx-line);
      border-radius: var(--vx-radius-xs);
      font-family: var(--vx-font-mono);
      font-size: 0.6875rem;
      color: var(--vx-text-muted);
      background: var(--vx-panel-2);
    }
    .ghost {
      border: 1px solid var(--vx-line);
      background: transparent;
      color: var(--vx-text-muted);
      border-radius: var(--vx-radius-sm);
      padding: var(--vx-space-2) var(--vx-space-3);
      font: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .ghost:hover {
      color: var(--vx-text);
      border-color: var(--vx-line-strong);
    }
    .ghost--strong {
      color: var(--vx-text);
      border-color: var(--vx-line-strong);
    }
    .content {
      flex: 1 1 auto;
      width: 100%;
      max-width: 1180px;
      margin: 0 auto;
      padding: var(--vx-space-5);
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: var(--vx-space-4);
      flex-wrap: wrap;
      padding: var(--vx-space-3) var(--vx-space-5);
      border-top: 1px solid var(--vx-line);
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
    .foot__ledger {
      font-family: var(--vx-font-mono);
      color: var(--vx-upcoming);
    }
    .foot__ledger--bad {
      color: var(--vx-overdue);
    }
  `,
})
export class VortexShell {
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Assinatura do app, exibida sob a marca (ex.: `ERP Manutencao - 43/145`). */
  public readonly subtitle = input('');
  /** Destino do clique na marca. */
  public readonly brandLink = input('/');
  /** Rotulo acessivel da navegacao principal. */
  public readonly navLabel = input('Navegacao principal');
  /** Links da navegacao do dominio hospedeiro. */
  public readonly nav = input<readonly ShellNavLink[]>([]);

  protected readonly context = this.auth.context;

  private readonly ledger = signal<{ valid: boolean; blocks: number } | null>(null);
  protected readonly ledgerBroken = computed(() => this.ledger()?.valid === false);
  protected readonly ledgerLabel = computed(() => {
    const state = this.ledger();
    if (state === null) {
      return 'ledger: verificando...';
    }
    return state.valid
      ? `ledger: integro (${state.blocks} blocos)`
      : 'ledger: FALHA DE VERIFICACAO';
  });

  public constructor() {
    this.audit
      .verifyLedger()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.ledger.set({ valid: result.valid, blocks: result.blocks }),
        error: () => this.ledger.set(null),
      });
  }

  protected short(value: string): string {
    return value.slice(0, 8);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/entrar']);
  }
}
