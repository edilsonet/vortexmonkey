import { Logger } from '@nestjs/common';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_REALTIME_NAMESPACE,
  COMMUNICATION_REALTIME_PATH,
  communicationRooms,
  type AnnouncementRecord,
  type CommunicationAnnouncementEvent,
  type CommunicationConversationEvent,
  type CommunicationMessageEvent,
  type CommunicationNoticeEvent,
  type CommunicationSubscribeResult,
  type ConversationRecord,
  type MessageRecord,
  type RequestContext,
  type UserNotificationRecord,
} from '@vortex/shared-dto';
import type { Server, Socket } from 'socket.io';
import { isTokenExpired, JwtService } from '../platform/auth/jwt.service';
import { CommunicationRepository } from './communication.repository';

/** Dados anexados ao socket depois do handshake autenticado. */
interface AuthenticatedSocket extends Socket {
  data: { context?: RequestContext };
}

/**
 * Canal de TEMPO REAL da Central de Comunicacao (WebSockets/socket.io).
 *
 * Nao e uma fonte de verdade: e o aviso do que ja foi ancorado no ledger e
 * persistido pelo canal REST. Por isso o socket nao "carrega" a mensagem: a
 * Shell recebe o evento, atualiza o badge e, ao abrir o modulo, rele a lista
 * pela API. Se o socket cair, nada se perde.
 *
 * Autenticacao: o access token JWT vai no handshake (`auth.token` ou
 * `Authorization`). Sem token valido o socket e desconectado - o RLS continuaria
 * barrando, mas negar cedo evita manter conexoes anonimas.
 *
 * Salas: `user:*` (avisos diretos), `tenant:*`/`company:*` (comunicados) e
 * `conversation:*` (so entra depois de o backend confirmar o vinculo via RLS).
 */
@WebSocketGateway({
  namespace: COMMUNICATION_REALTIME_NAMESPACE,
  path: COMMUNICATION_REALTIME_PATH,
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CommunicationGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  public constructor(
    private readonly jwt: JwtService,
    private readonly repository: CommunicationRepository,
  ) {}

  public handleConnection(client: AuthenticatedSocket): void {
    const token = this.extractToken(client);
    if (token === null) {
      client.disconnect(true);
      return;
    }
    let context: RequestContext;
    try {
      const claims = this.jwt.verify(token);
      context = { userId: claims.sub, tenantId: claims.tid, companyId: claims.cid };
    } catch (error) {
      this.logger.debug(
        `Handshake recusado: ${isTokenExpired(error) ? 'token expirado' : 'token invalido'}.`,
      );
      client.disconnect(true);
      return;
    }

    client.data.context = context;
    void client.join(communicationRooms.user(context.userId));
    void client.join(communicationRooms.tenant(context.tenantId));
    if (context.companyId) void client.join(communicationRooms.company(context.companyId));
    void this.pushSummary(client, context);
  }

  public handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.debug(`Socket encerrado (${client.id}).`);
  }

  /**
   * Entra na sala de uma conversa. A permissao e decidida pelo banco (RLS):
   * nao basta conhecer o `conversationId`.
   */
  @SubscribeMessage(COMMUNICATION_EVENTS.subscribe)
  public async subscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: unknown,
  ): Promise<CommunicationSubscribeResult> {
    const context = client.data.context;
    if (context === undefined || typeof conversationId !== 'string' || conversationId === '') {
      return { conversationId: String(conversationId ?? ''), subscribed: false, error: 'AUTH_REQUIRED' };
    }
    const allowed = await this.repository.isParticipant(context, conversationId);
    if (!allowed) {
      return { conversationId, subscribed: false, error: 'NOT_FOUND' };
    }
    await client.join(communicationRooms.conversation(conversationId));
    return { conversationId, subscribed: true };
  }

  @SubscribeMessage(COMMUNICATION_EVENTS.unsubscribe)
  public async unsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: unknown,
  ): Promise<CommunicationSubscribeResult> {
    if (typeof conversationId !== 'string' || conversationId === '') {
      return { conversationId: String(conversationId ?? ''), subscribed: false, error: 'VALIDATION_ERROR' };
    }
    await client.leave(communicationRooms.conversation(conversationId));
    return { conversationId, subscribed: false };
  }

  // -------------------------------------------------------------------------
  // Push (chamado pelo dominio DEPOIS do commit - best-effort, nunca lanca)
  // -------------------------------------------------------------------------

  public emitMessage(participantUserIds: readonly string[], message: MessageRecord): void {
    if (participantUserIds.length === 0) return;
    const event: CommunicationMessageEvent = { conversationId: message.conversationId, message };
    const userRooms = participantUserIds.map((userId) => communicationRooms.user(userId));
    // A sala da conversa e a sala do usuario sao ambas validas; `except` impede
    // que o mesmo socket (presente nas duas) conte a mensagem duas vezes.
    this.emitToRooms(
      [communicationRooms.conversation(message.conversationId)],
      COMMUNICATION_EVENTS.message,
      event,
      userRooms,
    );
    this.emitToRooms(userRooms, COMMUNICATION_EVENTS.message, event);
  }

  public emitConversation(participantUserIds: readonly string[], conversation: ConversationRecord): void {
    if (participantUserIds.length === 0) return;
    const event: CommunicationConversationEvent = { conversation };
    this.emitToRooms(
      participantUserIds.map((userId) => communicationRooms.user(userId)),
      COMMUNICATION_EVENTS.conversation,
      event,
    );
  }

  public emitAnnouncement(context: RequestContext, announcement: AnnouncementRecord): void {
    const event: CommunicationAnnouncementEvent = { announcement };
    const rooms = [communicationRooms.tenant(context.tenantId)];
    if (announcement.scope === 'COMPANY' && announcement.companyId) {
      rooms.push(communicationRooms.company(announcement.companyId));
    }
    this.emitToRooms(rooms, COMMUNICATION_EVENTS.announcement, event);
  }

  /** Aviso direto: vai apenas para a sala do proprio destinatario. */
  public emitNotice(userId: string, notification: UserNotificationRecord): void {
    const event: CommunicationNoticeEvent = { notification };
    this.emitToRooms([communicationRooms.user(userId)], COMMUNICATION_EVENTS.notice, event);
  }

  private emitToRooms(
    rooms: readonly string[],
    event: string,
    payload: unknown,
    except: string[] = [],
  ): void {
    try {
      // `Set` evita emitir duas vezes para a mesma sala (ex.: autor tambem
      // listado nos participantes), o que duplicaria o evento no cliente.
      for (const room of new Set(rooms)) {
        if (room === '') continue;
        this.server.to(room).except(except).emit(event, payload);
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao empurrar ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async pushSummary(client: AuthenticatedSocket, context: RequestContext): Promise<void> {
    try {
      const summary = await this.repository.summary(context);
      client.emit(COMMUNICATION_EVENTS.summary, summary);
    } catch (error) {
      // Sem snapshot inicial o cliente cai no REST; nao e fatal.
      this.logger.debug(
        `Resumo inicial indisponivel para ${context.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Token do handshake: `auth.token` (padrao socket.io) ou `Authorization`. */
  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as Record<string, unknown> | undefined)?.['token'];
    if (typeof authToken === 'string' && authToken !== '') return authToken;
    const header = client.handshake.headers.authorization;
    const bearer = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
    return bearer?.trim() ?? null;
  }
}
