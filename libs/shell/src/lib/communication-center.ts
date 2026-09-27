import { DestroyRef, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CommunicationRealtime,
  CommunicationStore,
  CommunicationService,
  NotificationService,
  ThemeService,
  type CommunicationModule,
} from '@vortex/core';
import { map, type Observable } from 'rxjs';

interface ModuleDescriptor {
  readonly id: CommunicationModule;
  readonly label: string;
  readonly description: string;
}

/** Item generico exibido no painel de um modulo. */
interface PanelItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly badge: string | null;
}

const MODULES: readonly ModuleDescriptor[] = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Conversas entre usuarios da mesma empresa e do processo seletivo.',
  },
  {
    id: 'alerts',
    label: 'Alertas',
    description: 'Badges do Hub Preditivo: INFO, WARNING, CRITICAL e BLOCKING.',
  },
  {
    id: 'mail',
    label: 'E-mails',
    description: 'Caixa de e-mails transacionais enviados e recebidos.',
  },
  {
    id: 'news',
    label: 'Comunicados',
    description: 'Avisos oficiais da plataforma e da empresa.',
  },
  {
    id: 'notices',
    label: 'Notificacoes',
    description: 'Avisos diretos de seguranca e eventos da sua conta.',
  },
];

/**
 * Central de Comunicacao da Shell (barra superior, presente em todos os apps).
 *
 * Exibe os modulos e os badges do `CommunicationStore`. A Shell apenas exibe:
 * o painel de cada modulo e alimentado pelo estado compartilhado, sem duplicar
 * historico — toda conversa relevante vira bloco no ledger no backend.
 */
@Component({
  selector: 'vx-communication-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cc">
      @for (module of modules; track module.id) {
        <button
          class="cc__btn"
          type="button"
          [class.cc__btn--on]="open() === module.id"
          [attr.aria-label]="module.label"
          [attr.aria-expanded]="open() === module.id"
          [title]="module.description"
          (click)="toggle(module.id)"
        >
          <span>{{ module.label }}</span>
          @if (counters()[module.id] > 0) {
            <span class="cc__badge">{{ counters()[module.id] }}</span>
          }
        </button>
      }

      @if (realtime.status() === 'online') {
        <span class="cc__live" title="Tempo real conectado" aria-label="Tempo real conectado"></span>
      }

      <button class="cc__btn" type="button" (click)="theme.cycle()" [title]="theme.label()">
        {{ theme.label() }}
      </button>

      @if (opened(); as module) {
        <button
          class="cc__scrim"
          type="button"
          aria-label="Fechar a Central de Comunicacao"
          (click)="close()"
        ></button>
        <section class="cc__panel" role="dialog" [attr.aria-label]="module.label">
          <h2 class="cc__panelTitle">{{ module.label }}</h2>
          <p class="cc__panelText">{{ module.description }}</p>
          @if (loading()) {
            <p class="cc__empty">Carregando...</p>
          } @else if (items().length > 0) {
            <ul class="cc__list">
              @for (item of items(); track item.id) {
                <li class="cc__item">
                  <span class="cc__itemTitle">{{ item.title }}</span>
                  @if (item.badge; as badge) {
                    <span class="cc__itemBadge">{{ badge }}</span>
                  }
                  @if (item.detail; as detail) {
                    <span class="cc__itemDetail">{{ detail }}</span>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="cc__empty">Nenhum item no momento.</p>
          }
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      position: relative;
    }
    .cc {
      display: flex;
      align-items: center;
      gap: var(--vx-space-1);
    }
    .cc__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--vx-space-1);
      border: 1px solid transparent;
      background: transparent;
      color: var(--vx-text-muted);
      border-radius: var(--vx-radius-sm);
      padding: var(--vx-space-2) var(--vx-space-2);
      font: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .cc__btn:hover,
    .cc__btn--on {
      background: var(--vx-panel-2);
      color: var(--vx-text);
    }
    .cc__badge {
      min-width: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--vx-overdue);
      color: var(--vx-accent-ink);
      font-family: var(--vx-font-mono);
      font-size: 0.625rem;
      line-height: 16px;
      text-align: center;
    }
    .cc__live {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--vx-upcoming);
    }
    .cc__scrim {
      position: fixed;
      inset: 0;
      z-index: 20;
      border: 0;
      padding: 0;
      background: transparent;
      cursor: default;
    }
    .cc__panel {
      position: absolute;
      top: calc(100% + var(--vx-space-2));
      right: 0;
      z-index: 21;
      width: min(320px, 90vw);
      padding: var(--vx-space-4);
      border: 1px solid var(--vx-line-strong);
      border-radius: var(--vx-radius-sm);
      background: var(--vx-panel);
      box-shadow: 0 12px 32px rgb(0 0 0 / 24%);
    }
    .cc__panelTitle {
      margin: 0 0 var(--vx-space-2);
      font-size: 0.875rem;
      letter-spacing: 0.04em;
    }
    .cc__panelText {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--vx-text-muted);
    }
    .cc__empty {
      margin: var(--vx-space-3) 0 0;
      padding-top: var(--vx-space-3);
      border-top: 1px solid var(--vx-line);
      font-size: 0.8125rem;
      color: var(--vx-text-faint);
    }
    .cc__list {
      margin: var(--vx-space-3) 0 0;
      padding: var(--vx-space-3) 0 0;
      border-top: 1px solid var(--vx-line);
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--vx-space-2);
      max-height: 320px;
      overflow-y: auto;
    }
    .cc__item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0 var(--vx-space-2);
      font-size: 0.8125rem;
    }
    .cc__itemTitle {
      color: var(--vx-text);
    }
    .cc__itemBadge {
      font-family: var(--vx-font-mono);
      font-size: 0.625rem;
      color: var(--vx-text-muted);
    }
    .cc__itemDetail {
      grid-column: 1 / -1;
      font-size: 0.75rem;
      color: var(--vx-text-faint);
    }
  `,
})
export class CommunicationCenter {
  protected readonly theme = inject(ThemeService);
  protected readonly realtime = inject(CommunicationRealtime);
  private readonly store = inject(CommunicationStore);
  private readonly service = inject(CommunicationService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly modules = MODULES;
  protected readonly counters = this.store.counters;
  protected readonly open = signal<CommunicationModule | null>(null);
  protected readonly items = signal<readonly PanelItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly opened = computed(() => {
    const id = this.open();
    return id === null ? null : (MODULES.find((module) => module.id === id) ?? null);
  });

  public constructor() {
    // Os badges vem da API; a Shell so exibe. Falha de leitura nao quebra o
    // chrome: o estado simplesmente permanece vazio.
    this.service
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.store.set(summary.counters),
        error: () => this.store.clear(),
      });
  }

  protected toggle(id: CommunicationModule): void {
    if (this.open() === id) {
      this.close();
      return;
    }
    this.open.set(id);
    this.load(id);
  }

  protected close(): void {
    this.open.set(null);
    this.items.set([]);
    this.loading.set(false);
  }

  private load(id: CommunicationModule): void {
    this.items.set([]);
    this.loading.set(true);
    const source: () => Observable<readonly PanelItem[]> = {
      chat: () =>
        this.service
          .listConversations()
          .pipe(
            map((rows) =>
              rows.map((row) => ({
                id: row.id,
                title: row.title,
                detail: row.lastMessagePreview,
                badge: row.unreadCount > 0 ? String(row.unreadCount) : null,
              })),
            ),
          ),
      alerts: () =>
        this.service
          .listAlerts()
          .pipe(
            map((rows) =>
              rows.map((row) => ({
                id: row.id,
                title: row.title,
                detail: row.detail,
                badge: row.severity,
              })),
            ),
          ),
      mail: () =>
        this.service
          .listMail()
          .pipe(
            map((rows) =>
              rows.map((row) => ({
                id: row.id,
                title: row.subject,
                detail: row.direction === 'IN' ? `de ${row.fromAddress}` : `para ${row.toAddress}`,
                badge: row.readAt === null && row.direction === 'IN' ? 'nao lido' : row.status,
              })),
            ),
          ),
      news: () =>
        this.service
          .listAnnouncements()
          .pipe(
            map((rows) =>
              rows.map((row) => ({
                id: row.id,
                title: row.title,
                detail: row.body,
                badge: row.read ? 'lido' : row.severity,
              })),
            ),
          ),
      notices: () =>
        this.notifications
          .list()
          .pipe(
            map((rows) =>
              rows.map((row) => ({
                id: row.id,
                title: row.title,
                detail: row.body,
                badge: row.readAt === null ? row.severity : 'lida',
              })),
            ),
          ),
    }[id];

    source()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.loading.set(false);
        },
      });
  }
}
