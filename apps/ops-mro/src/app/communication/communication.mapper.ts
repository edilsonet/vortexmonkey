import type {
  AnnouncementRecord,
  ConversationRecord,
  MailRecord,
  MessageRecord,
} from '@vortex/shared-dto';

/**
 * Conversao linha→contrato da Central de Comunicacao.
 *
 * Funcoes puras: nao conhecem o banco nem a transacao. Ficam separadas para
 * poderem ser testadas sem PostgreSQL e para manter o repositorio responsavel
 * apenas por SQL.
 */

export interface ConversationRow {
  readonly id: string;
  readonly company_id: string | null;
  readonly topic: ConversationRecord['topic'];
  readonly title: string;
  readonly status: ConversationRecord['status'];
  readonly unread_count: number;
  readonly message_count: number;
  readonly last_message_at: Date | string | null;
  readonly last_message_preview: string | null;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

export interface MessageRow {
  readonly id: string;
  readonly conversation_id: string;
  readonly author_user_id: string;
  readonly author_name: string | null;
  readonly body: string;
  readonly created_at: Date | string;
}

export interface AnnouncementRow {
  readonly id: string;
  readonly company_id: string | null;
  readonly scope: AnnouncementRecord['scope'];
  readonly severity: AnnouncementRecord['severity'];
  readonly title: string;
  readonly body: string;
  readonly published_by: string;
  readonly published_at: Date | string;
  readonly expires_at: Date | string | null;
  readonly read: boolean;
}

export interface MailRow {
  readonly id: string;
  readonly company_id: string | null;
  readonly direction: MailRecord['direction'];
  readonly from_address: string;
  readonly to_address: string;
  readonly subject: string;
  readonly body: string;
  readonly status: MailRecord['status'];
  readonly related_entity_type: string | null;
  readonly related_entity_id: string | null;
  readonly read_at: Date | string | null;
  readonly created_at: Date | string;
}

/** Normaliza um instante do driver (Date ou string) para ISO 8601. */
export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Igual a `toIso`, mas preserva o nulo (marcas d'agua ausentes). */
export function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

export function toConversationRecord(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    topic: row.topic,
    title: row.title,
    status: row.status,
    unreadCount: Number(row.unread_count),
    messageCount: Number(row.message_count),
    lastMessageAt: toIsoOrNull(row.last_message_at),
    lastMessagePreview: row.last_message_preview,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function toMessageRecord(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: toIso(row.created_at),
  };
}

export function toAnnouncementRecord(row: AnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    scope: row.scope,
    severity: row.severity,
    title: row.title,
    body: row.body,
    publishedBy: row.published_by,
    publishedAt: toIso(row.published_at),
    expiresAt: toIsoOrNull(row.expires_at),
    read: row.read,
  };
}

export function toMailRecord(row: MailRow): MailRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    direction: row.direction,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    subject: row.subject,
    body: row.body,
    status: row.status,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    readAt: toIsoOrNull(row.read_at),
    createdAt: toIso(row.created_at),
  };
}
