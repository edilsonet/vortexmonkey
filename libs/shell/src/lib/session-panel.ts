import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService, SessionStore } from '@vortex/core';
import type { SessionRecord } from '@vortex/shared-dto';

/**
 * Sessoes ativas do usuario (barra superior da Shell).
 *
 * Lista uma linha por familia de refresh tokens — o "dispositivo" que abriu a
 * sessao — e permite encerrar uma so. A sessao atual e destacada; encerra-la
 * derruba a propria Shell para o login. A Shell apenas exibe: a verdade esta no
 * servidor (`identity.list_user_sessions`).
 */
@Component({
  selector: 'vx-session-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="sp__btn"
      type="button"
      aria-label="Sessoes ativas"
      [attr.aria-expanded]="open()"
      title="Dispositivos com sessao ativa"
      (click)="toggle()"
    >
      Sessoes
    </button>

    @if (open()) {
      <button class="sp__scrim" type="button" aria-label="Fechar sessoes" (click)="close()"></button>
      <section class="sp__panel" role="dialog" aria-label="Sessoes ativas">
        <h2 class="sp__title">Sessoes ativas</h2>
        @if (loading()) {
          <p class="sp__empty">Carregando...</p>
        } @else if (sessions().length > 0) {
          <ul class="sp__list">
            @for (session of sessions(); track session.id) {
              <li class="sp__item">
                <span class="sp__device">{{ device(session) }}</span>
                @if (session.id === currentId()) {
                  <span class="sp__badge">esta sessao</span>
                }
                <span class="sp__meta">{{ activity(session) }}</span>
                <button
                  class="sp__revoke"
                  type="button"
                  [attr.aria-label]="'Encerrar ' + device(session)"
                  (click)="revoke(session.id)"
                >
                  Encerrar
                </button>
              </li>
            }
          </ul>
          <button class="sp__all" type="button" (click)="revokeAll()">
            Encerrar todas as sessoes
          </button>
        } @else {
          <p class="sp__empty">Nenhuma sessao ativa.</p>
        }
      </section>
    }
  `,
  styles: `
    :host {
      position: relative;
    }
    .sp__btn {
      border: 1px solid transparent;
      background: transparent;
      color: var(--vx-text-muted);
      border-radius: var(--vx-radius-sm);
      padding: var(--vx-space-2);
      font: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .sp__btn:hover {
      background: var(--vx-panel-2);
      color: var(--vx-text);
    }
    .sp__scrim {
      position: fixed;
      inset: 0;
      z-index: 20;
      border: 0;
      padding: 0;
      background: transparent;
      cursor: default;
    }
    .sp__panel {
      position: absolute;
      top: calc(100% + var(--vx-space-2));
      right: 0;
      z-index: 21;
      width: min(360px, 92vw);
      padding: var(--vx-space-4);
      border: 1px solid var(--vx-line-strong);
      border-radius: var(--vx-radius-sm);
      background: var(--vx-panel);
      box-shadow: 0 12px 32px rgb(0 0 0 / 24%);
    }
    .sp__title {
      margin: 0 0 var(--vx-space-2);
      font-size: 0.875rem;
      letter-spacing: 0.04em;
    }
    .sp__list {
      margin: var(--vx-space-2) 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--vx-space-2);
      max-height: 320px;
      overflow-y: auto;
    }
    .sp__item {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: var(--vx-space-2);
      padding: var(--vx-space-2) 0;
      border-bottom: 1px solid var(--vx-line);
      font-size: 0.8125rem;
    }
    .sp__device {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--vx-text);
    }
    .sp__meta {
      grid-column: 1 / -1;
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
    .sp__badge {
      font-family: var(--vx-font-mono);
      font-size: 0.625rem;
      color: var(--vx-text-muted);
    }
    .sp__revoke,
    .sp__all {
      border: 1px solid var(--vx-line-strong);
      background: transparent;
      color: var(--vx-text-muted);
      border-radius: var(--vx-radius-sm);
      padding: 2px var(--vx-space-2);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .sp__revoke:hover,
    .sp__all:hover {
      color: var(--vx-overdue);
      border-color: var(--vx-overdue);
    }
    .sp__all {
      width: 100%;
      margin-top: var(--vx-space-3);
      padding: var(--vx-space-2);
    }
    .sp__empty {
      margin: var(--vx-space-3) 0 0;
      font-size: 0.8125rem;
      color: var(--vx-text-faint);
    }
  `,
})
export class SessionPanel {
  private readonly auth = inject(AuthService);
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly sessions = signal<readonly SessionRecord[]>([]);
  protected readonly currentId = computed(() => this.store.sessionId());

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.load();
  }

  protected close(): void {
    this.open.set(false);
  }

  protected device(session: SessionRecord): string {
    const agent = session.userAgent?.trim();
    return agent && agent.length > 0 ? agent : 'Dispositivo desconhecido';
  }

  protected activity(session: SessionRecord): string {
    const at = session.lastUsedAt ?? session.createdAt;
    const prefix = session.lastUsedAt === null ? 'aberta em' : 'ultimo acesso em';
    const ip = session.ipAddress === null ? '' : ` - ${session.ipAddress}`;
    return `${prefix} ${new Date(at).toLocaleString('pt-BR')}${ip}`;
  }

  protected revoke(sessionId: string): void {
    const isCurrent = sessionId === this.currentId();
    this.auth
      .revokeSession(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (isCurrent) {
            void this.router.navigate(['/entrar']);
            return;
          }
          this.load();
        },
        error: () => this.load(),
      });
  }

  protected revokeAll(): void {
    this.auth
      .revokeAllSessions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate(['/entrar']),
        error: () => this.load(),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.auth
      .listSessions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.sessions.set(response.sessions);
          this.loading.set(false);
        },
        error: () => {
          this.sessions.set([]);
          this.loading.set(false);
        },
      });
  }
}
