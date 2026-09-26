/**
 * Contratos HTTP da Central de Comunicacao (barra superior da Shell).
 *
 * A Central EXIBE o que ja foi registrado: cada mensagem, comunicado e e-mail
 * e um registro ancorado no ledger. Os contadores (`CommunicationCounters`) sao
 * estado corrente — o que alimenta os badges da Shell — e nunca um historico
 * paralelo.
 *
 * Datas sao strings ISO 8601. `companyId` nulo significa conversa/comunicado de
 * escopo tenant (ex.: recrutamento, aviso da plataforma).
 */

import type { AlertSeverity } from './aeronautics';
import type { AircraftAlert, LedgerAnchor } from './mro-api';

export type ConversationTopic = 'COMPANY' | 'RECRUITMENT' | 'DIRECT' | 'TENANT';
export type ConversationStatus = 'OPEN' | 'ARCHIVED';
export type AnnouncementScope = 'PLATFORM' | 'TENANT' | 'COMPANY';
export type MailDirection = 'IN' | 'OUT';
export type MailStatus = 'QUEUED' | 'SENT' | 'RECEIVED' | 'FAILED';

/** Contadores por modulo, exibidos como badges na Shell. */
export interface CommunicationCounters {
  readonly chat: number;
  readonly alerts: number;
  readonly mail: number;
  readonly news: number;
  /** Avisos diretos ao usuario (ex.: sessao encerrada por seguranca). */
  readonly notices: number;
}

export interface CommunicationSummary {
  readonly counters: CommunicationCounters;
  readonly generatedAt: string;
}

/**
 * Consulta de alertas da Central: e o mesmo Hub Preditivo do ERP (`aircraftId`
 * e `itemId` vem da projecao `notifications.alerts`), apenas lido pela Shell.
 */
export type CommunicationAlerts = readonly AircraftAlert[];

export interface ConversationRecord {
  readonly id: string;
  readonly companyId: string | null;
  readonly topic: ConversationTopic;
  readonly title: string;
  readonly status: ConversationStatus;
  readonly unreadCount: number;
  readonly messageCount: number;
  readonly lastMessageAt: string | null;
  readonly lastMessagePreview: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MessageRecord {
  readonly id: string;
  readonly conversationId: string;
  readonly authorUserId: string;
  readonly authorName: string | null;
  readonly body: string;
  readonly createdAt: string;
}

export interface CreateConversationRequest {
  readonly topic: ConversationTopic;
  readonly title: string;
  /** Nulo = conversa de escopo tenant (ex.: recrutamento). */
  readonly companyId?: string | null;
  /** Outros participantes alem do criador (que sempre entra). */
  readonly participantUserIds?: readonly string[];
}

export interface CreateConversationResponse extends LedgerAnchor {
  readonly conversation: ConversationRecord;
}

export interface PostMessageRequest {
  readonly body: string;
}

export interface PostMessageResponse extends LedgerAnchor {
  readonly message: MessageRecord;
}

export interface ConversationReadResponse {
  readonly conversationId: string;
  readonly lastReadAt: string;
}

export interface AnnouncementRecord {
  readonly id: string;
  readonly companyId: string | null;
  readonly scope: AnnouncementScope;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly publishedBy: string;
  readonly publishedAt: string;
  readonly expiresAt: string | null;
  /** Se o usuario do contexto ja marcou este comunicado como lido. */
  readonly read: boolean;
}

export interface PublishAnnouncementRequest {
  readonly scope: AnnouncementScope;
  readonly companyId?: string | null;
  readonly severity?: AlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly expiresAt?: string | null;
}

export interface PublishAnnouncementResponse extends LedgerAnchor {
  readonly announcement: AnnouncementRecord;
}

export interface AnnouncementReadResponse {
  readonly announcementId: string;
  readonly readAt: string;
}

export interface MailRecord {
  readonly id: string;
  readonly companyId: string | null;
  readonly direction: MailDirection;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly subject: string;
  readonly body: string;
  readonly status: MailStatus;
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface QueueMailRequest {
  readonly toAddress: string;
  readonly subject: string;
  readonly body: string;
  readonly relatedEntityType?: string | null;
  readonly relatedEntityId?: string | null;
}

export interface QueueMailResponse extends LedgerAnchor {
  readonly mail: MailRecord;
}

export interface MailReadResponse {
  readonly mail: MailRecord;
}
