/**
 * Contratos de TEMPO REAL da Central de Comunicacao (barra superior da Shell).
 *
 * O WebSocket e um CANAL DE AVISO, nunca uma segunda fonte de verdade: o mesmo
 * ato de fala continua ancorado no ledger e persistido nas tabelas de
 * `communication` (migracao 0015). O evento empurrado aqui carrega o MESMO
 * registro que a rota REST devolveria, para que a Shell atualize sem duplicar
 * historico. Se o socket cair, o cliente volta a ler por REST (`GET
 * /api/communication/*`) sem perda: nada existe so no canal.
 *
 * Autenticacao: o handshake leva o access token JWT. Cada socket entra nas
 * salas do seu contexto (`user:`, `tenant:`, `company:`) e so entra numa sala
 * `conversation:` depois que o backend confirma o acesso (RLS).
 */

import type { RequestContext } from './context';
import type {
  AnnouncementRecord,
  CommunicationSummary,
  ConversationRecord,
  MessageRecord,
} from './communication-api';
import type { UserNotificationRecord } from './notification-api';

/** Namespace socket.io da Central. */
export const COMMUNICATION_REALTIME_NAMESPACE = 'communication';

/**
 * Caminho do transporte. Fica sob o prefixo `/api` para ser servido pelo mesmo
 * proxy reverso das rotas REST (nginx de `docker/web/nginx.conf` e o dev-server
 * do Angular), sem abrir uma segunda entrada publica.
 */
export const COMMUNICATION_REALTIME_PATH = '/api/socket.io';

/** Nova mensagem em uma conversa visivel ao socket. */
export interface CommunicationMessageEvent {
  readonly conversationId: string;
  readonly message: MessageRecord;
}

/** Nova conversa do contexto (o socket entra na sala dela ao receber). */
export interface CommunicationConversationEvent {
  readonly conversation: ConversationRecord;
}

/** Comunicado oficial publicado no escopo do contexto. */
export interface CommunicationAnnouncementEvent {
  readonly announcement: AnnouncementRecord;
}

/** Aviso direto ao usuario (ex.: sessao encerrada por seguranca). */
export interface CommunicationNoticeEvent {
  readonly notification: UserNotificationRecord;
}

/** Eventos servidor -> cliente. */
export interface CommunicationServerEvents {
  'communication:message': (event: CommunicationMessageEvent) => void;
  'communication:conversation': (event: CommunicationConversationEvent) => void;
  'communication:announcement': (event: CommunicationAnnouncementEvent) => void;
  'communication:notice': (event: CommunicationNoticeEvent) => void;
  'communication:summary': (summary: CommunicationSummary) => void;
}

/** Resultado do pedido de entrada numa sala de conversa. */
export interface CommunicationSubscribeResult {
  readonly conversationId: string;
  readonly subscribed: boolean;
  /** Motivo, quando `subscribed` e falso (ex.: conversa fora do vinculo). */
  readonly error?: string;
}

/** Eventos cliente -> servidor. */
export interface CommunicationClientEvents {
  'conversation:subscribe': (
    conversationId: string,
    ack?: (result: CommunicationSubscribeResult) => void,
  ) => void;
  'conversation:unsubscribe': (
    conversationId: string,
    ack?: (result: CommunicationSubscribeResult) => void,
  ) => void;
}

/** Dados anexados a cada socket autenticado. */
export interface CommunicationSocketData {
  readonly context: RequestContext;
}

/** Nomes canonicos dos eventos (evita string solta nos dois lados). */
export const COMMUNICATION_EVENTS = {
  message: 'communication:message',
  conversation: 'communication:conversation',
  announcement: 'communication:announcement',
  notice: 'communication:notice',
  summary: 'communication:summary',
  subscribe: 'conversation:subscribe',
  unsubscribe: 'conversation:unsubscribe',
} as const;

/** Salas do gateway (prefixadas para nao colidir entre escopos). */
export const communicationRooms = {
  user: (userId: string): string => `user:${userId}`,
  tenant: (tenantId: string): string => `tenant:${tenantId}`,
  company: (companyId: string): string => `company:${companyId}`,
  conversation: (conversationId: string): string => `conversation:${conversationId}`,
};
