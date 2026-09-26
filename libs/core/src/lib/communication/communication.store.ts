import { Injectable, computed, signal } from '@angular/core';

/** Modulos da Central de Comunicacao (barra superior da Shell). */
export type CommunicationModule = 'chat' | 'alerts' | 'mail' | 'news' | 'notices';

export interface CommunicationCounters {
  readonly chat: number;
  readonly alerts: number;
  readonly mail: number;
  readonly news: number;
  readonly notices: number;
}

const EMPTY: CommunicationCounters = { chat: 0, alerts: 0, mail: 0, news: 0, notices: 0 };

/**
 * Estado dos badges da Central de Comunicacao.
 *
 * E o ponto de integracao da Shell com a API da Central: enquanto a Central
 * (chat, alertas, e-mails e comunicados) nao tem backend, o estado fica vazio
 * e a Shell apenas exibe os modulos. Quando a API existir, basta alimentar
 * `set()` a partir do canal de tempo real/polling — a Shell nao muda.
 */
@Injectable({ providedIn: 'root' })
export class CommunicationStore {
  private readonly state = signal<CommunicationCounters>(EMPTY);

  public readonly counters = this.state.asReadonly();
  public readonly total = computed(() => {
    const current = this.state();
    return current.chat + current.alerts + current.mail + current.news + current.notices;
  });

  public set(counters: Partial<CommunicationCounters>): void {
    this.state.update((current) => ({ ...current, ...counters }));
  }

  public clear(): void {
    this.state.set(EMPTY);
  }
}
