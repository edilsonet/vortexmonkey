import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_REALTIME_NAMESPACE,
  COMMUNICATION_REALTIME_PATH,
  type CommunicationAnnouncementEvent,
  type CommunicationClientEvents,
  type CommunicationConversationEvent,
  type CommunicationMessageEvent,
  type CommunicationNoticeEvent,
  type CommunicationServerEvents,
  type CommunicationSummary,
} from '@vortex/shared-dto';
import { io, type Socket } from 'socket.io-client';
import { SessionStore } from '../auth/session.store';
import { CommunicationStore } from './communication.store';

/** Estado da conexao de tempo real, para a Shell indicar ao usuario. */
export type RealtimeStatus = 'idle' | 'connecting' | 'online' | 'offline';

/**
 * Cliente do canal de tempo real da Central de Comunicacao.
 *
 * Aviso, nao verdade: cada evento apenas atualiza os badges; o painel de um
 * modulo continua lendo a lista pela API. Ao (re)conectar, o servidor empurra o
 * resumo corrente, que zera qualquer contagem perdida enquanto o socket esteve
 * fora. O socket se (des)conecta conforme a sessao: sem token, sem conexao.
 */
@Injectable({ providedIn: 'root' })
export class CommunicationRealtime {
  private readonly session = inject(SessionStore);
  private readonly store = inject(CommunicationStore);

  private socket: Socket<CommunicationServerEvents, CommunicationClientEvents> | null = null;
  private currentToken: string | null = null;
  private readonly state = signal<RealtimeStatus>('idle');

  /** Estado da conexao (idle/connecting/online/offline). */
  public readonly status = this.state.asReadonly();

  public constructor() {
    // Reage a entrada/saida da sessao e a rotacao do access token no refresh.
    effect(() => {
      const session = this.session.session();
      if (session === null) {
        this.disconnect();
        return;
      }
      this.connect(session.token);
    });
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /** Entra na sala de uma conversa (o servidor confirma o vinculo via RLS). */
  public subscribeConversation(conversationId: string): void {
    this.socket?.emit(COMMUNICATION_EVENTS.subscribe, conversationId);
  }

  public unsubscribeConversation(conversationId: string): void {
    this.socket?.emit(COMMUNICATION_EVENTS.unsubscribe, conversationId);
  }

  private connect(token: string): void {
    if (this.socket !== null && this.currentToken === token) return;
    this.disconnect();
    this.currentToken = token;
    this.state.set('connecting');
    const socket = io(COMMUNICATION_REALTIME_NAMESPACE, {
      path: COMMUNICATION_REALTIME_PATH,
      transports: ['websocket'],
      auth: { token },
    });
    this.socket = socket;

    socket.on('connect', () => this.state.set('online'));
    socket.on('disconnect', () => this.state.set('offline'));
    socket.on('connect_error', () => this.state.set('offline'));
    socket.io.on('reconnect_attempt', () => this.state.set('connecting'));

    socket.on(COMMUNICATION_EVENTS.summary, (summary: CommunicationSummary) => {
      this.store.set(summary.counters);
    });
    socket.on(COMMUNICATION_EVENTS.message, (event: CommunicationMessageEvent) => {
      // Mensagem propria nao e "nao lida" para quem escreveu.
      if (event.message.authorUserId !== this.session.context()?.userId) {
        this.bump('chat');
      }
    });
    socket.on(COMMUNICATION_EVENTS.conversation, (_event: CommunicationConversationEvent) => {
      this.bump('chat');
    });
    socket.on(COMMUNICATION_EVENTS.announcement, (_event: CommunicationAnnouncementEvent) => {
      this.bump('news');
    });
    socket.on(COMMUNICATION_EVENTS.notice, (_event: CommunicationNoticeEvent) => {
      this.bump('notices');
    });
  }

  private disconnect(): void {
    this.currentToken = null;
    if (this.socket === null) {
      this.state.set('idle');
      return;
    }
    this.socket.removeAllListeners();
    this.socket.io.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.state.set('idle');
  }

  private bump(key: 'chat' | 'news' | 'notices'): void {
    this.store.set({ [key]: this.store.counters()[key] + 1 });
  }
}
