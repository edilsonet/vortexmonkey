import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
  AnnouncementReadResponse,
  AnnouncementRecord,
  CommunicationAlerts,
  CommunicationSummary,
  ConversationReadResponse,
  ConversationRecord,
  CreateConversationRequest,
  CreateConversationResponse,
  MailReadResponse,
  MailRecord,
  MessageRecord,
  PostMessageRequest,
  PostMessageResponse,
  PublishAnnouncementRequest,
  PublishAnnouncementResponse,
  QueueMailRequest,
  QueueMailResponse,
  RequestContext,
} from '@vortex/shared-dto';
import { randomUUID } from 'node:crypto';
import type { SqlClient } from '../platform/database/database.service';
import { DatabaseService } from '../platform/database/database.service';
import { LedgerService } from '../platform/ledger/ledger.service';
import {
  toAnnouncementRecord,
  toConversationRecord,
  toIso,
  toMailRecord,
  toMessageRecord,
  type AnnouncementRow,
  type ConversationRow,
  type MailRow,
  type MessageRow,
} from './communication.mapper';

/** Linha de alerta lida de `notifications.alerts` (Hub Preditivo). */
interface AlertRow {
  id: string;
  aircraft_id: string;
  item_id: string;
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
  urgency: 'overdue' | 'due_soon' | 'upcoming' | 'none';
  title: string;
  detail: string | null;
  updated_at: Date | string;
}

interface SummaryRow {
  chat: number;
  alerts: number;
  mail: number;
  news: number;
  notices: number;
}

interface IdRow {
  id: string;
}

interface CompanyRow {
  company_id: string | null;
}

const CONVERSATION_SELECT = `SELECT c.id, c.company_id, c.topic, c.title, c.status,
    c.created_at, c.updated_at,
    (SELECT count(*) FROM communication.messages m WHERE m.conversation_id = c.id)::int AS message_count,
    (SELECT count(*) FROM communication.messages m
       WHERE m.conversation_id = c.id AND m.author_user_id <> $1
         AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at))::int AS unread_count,
    last.created_at AS last_message_at,
    left(last.body, 160) AS last_message_preview
  FROM communication.conversation_participants p
  JOIN communication.conversations c ON c.id = p.conversation_id
  LEFT JOIN LATERAL (
    SELECT body, created_at FROM communication.messages m
     WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC
     LIMIT 1
  ) last ON true
 WHERE p.user_id = $1`;

const MESSAGE_SELECT = `SELECT m.id, m.conversation_id, m.author_user_id,
    u.full_name AS author_name, m.body, m.created_at
  FROM communication.messages m
  LEFT JOIN identity.users u ON u.id = m.author_user_id`;

const ANNOUNCEMENT_SELECT = `SELECT a.id, a.company_id, a.scope, a.severity, a.title, a.body,
    a.published_by, a.published_at, a.expires_at,
    (r.user_id IS NOT NULL) AS read
  FROM communication.announcements a
  LEFT JOIN communication.announcement_reads r
    ON r.announcement_id = a.id AND r.user_id = $1`;

const MAIL_COLUMNS = `id, company_id, direction, from_address, to_address, subject, body,
  status, related_entity_type, related_entity_id, read_at, created_at`;

/**
 * Persistencia da Central de Comunicacao.
 *
 * Toda escrita acontece em UMA transacao que tambem ancora o bloco no ledger
 * (regra 1). O RLS e aplicado pelo `withContext`: sem vinculo ativo, nada e
 * visivel e nenhuma escrita e aceita pelo proprio banco. As marcas d'agua de
 * leitura sao estado de consumo por usuario e NAO geram bloco (ver migracao
 * 0015).
 */
@Injectable()
export class CommunicationRepository {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Contadores dos badges. Cada subconsulta e filtrada pelo RLS do contexto;
   * `$1` e o usuario corrente para as marcas d'agua de leitura.
   */
  public summary(context: RequestContext): Promise<CommunicationSummary> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<SummaryRow>(
        `SELECT
           (SELECT count(*)
              FROM communication.messages m
              JOIN communication.conversation_participants p
                ON p.conversation_id = m.conversation_id
             WHERE p.user_id = $1
               AND m.author_user_id <> $1
               AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at))::int AS chat,
           (SELECT count(*) FROM notifications.alerts WHERE resolved_at IS NULL)::int AS alerts,
           (SELECT count(*) FROM communication.mail_messages
             WHERE direction = 'IN' AND read_at IS NULL)::int AS mail,
           (SELECT count(*)
              FROM communication.announcements a
             WHERE NOT EXISTS (
               SELECT 1 FROM communication.announcement_reads r
                WHERE r.announcement_id = a.id AND r.user_id = $1
             ))::int AS news,
           (SELECT count(*)
              FROM notifications.user_notifications n
             WHERE n.user_id = $1 AND n.read_at IS NULL)::int AS notices`,
        [context.userId],
      );
      const row = result.rows[0] ?? { chat: 0, alerts: 0, mail: 0, news: 0, notices: 0 };
      return {
        counters: {
          chat: Number(row.chat),
          alerts: Number(row.alerts),
          mail: Number(row.mail),
          news: Number(row.news),
          notices: Number(row.notices),
        },
        generatedAt: new Date().toISOString(),
      };
    });
  }

  public listConversations(context: RequestContext): Promise<ConversationRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<ConversationRow>(
        `${CONVERSATION_SELECT} ORDER BY coalesce(last.created_at, c.created_at) DESC`,
        [context.userId],
      );
      return result.rows.map(toConversationRecord);
    });
  }

  public createConversation(
    context: RequestContext,
    input: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    const id = randomUUID();
    const companyId = input.companyId ?? context.companyId ?? null;
    if (input.topic === 'COMPANY' && companyId === null) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Conversa de empresa exige companyId (ou vinculo de empresa no contexto).',
      });
    }
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'communication.conversations',
        entityId: id,
        actionType: 'COMMUNICATION_CONVERSATION_CREATED',
        payload: { topic: input.topic, title: input.title, companyId },
      });
      const result = await client.query<{
        id: string;
        created_at: Date | string;
        updated_at: Date | string;
      }>(
        `INSERT INTO communication.conversations(
           id, tenant_id, company_id, topic, title, created_by, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at, updated_at`,
        [id, context.tenantId, companyId, input.topic, input.title, context.userId, blockId],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de conversa nao retornou registro.');

      await this.insertParticipants(client, context, id, input.participantUserIds ?? []);

      return {
        conversation: {
          id,
          companyId,
          topic: input.topic,
          title: input.title,
          status: 'OPEN',
          unreadCount: 0,
          messageCount: 0,
          lastMessageAt: null,
          lastMessagePreview: null,
          createdAt: toIso(row.created_at),
          updatedAt: toIso(row.updated_at),
        },
        ledgerBlockId: blockId,
        ledgerHash,
      };
    });
  }

  /**
   * Insere o criador e os demais participantes. Usuarios fora do alcance do
   * contexto nao aparecem em `identity.users` (RLS) e a insercao e recusada com
   * VALIDATION_ERROR, em vez de gravar um participante invisivel.
   */
  private async insertParticipants(
    client: SqlClient,
    context: RequestContext,
    conversationId: string,
    participantUserIds: readonly string[],
  ): Promise<void> {
    const unique = Array.from(new Set([context.userId, ...participantUserIds]));
    const visible = await client.query<IdRow>(
      'SELECT id FROM identity.users WHERE id = ANY($1::uuid[])',
      [unique],
    );
    const visibleIds = new Set(visible.rows.map((item) => item.id));
    const missing = unique.filter((userId) => !visibleIds.has(userId));
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Participante invalido ou fora do vinculo do contexto.',
        details: { missing },
      });
    }
    await client.query(
      `INSERT INTO communication.conversation_participants(conversation_id, user_id)
       SELECT $1, unnest($2::uuid[])
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, unique],
    );
  }

  public listMessages(context: RequestContext, conversationId: string): Promise<MessageRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<MessageRow>(
        `${MESSAGE_SELECT} WHERE m.conversation_id = $1 ORDER BY m.created_at`,
        [conversationId],
      );
      return result.rows.map(toMessageRecord);
    });
  }

  public postMessage(
    context: RequestContext,
    conversationId: string,
    input: PostMessageRequest,
  ): Promise<PostMessageResponse> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const companyId = await this.conversationCompany(client, conversationId);
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'communication.messages',
        entityId: id,
        actionType: 'COMMUNICATION_MESSAGE_SENT',
        payload: { conversationId, body: input.body },
      });
      await client.query(
        `INSERT INTO communication.messages(
           id, tenant_id, company_id, conversation_id, author_user_id, body, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, context.tenantId, companyId, conversationId, context.userId, input.body, blockId],
      );
      await client.query(
        `UPDATE communication.conversations
            SET updated_at = clock_timestamp()
          WHERE id = $1`,
        [conversationId],
      );
      const message = await client.query<MessageRow>(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
      const row = message.rows[0];
      if (row === undefined) throw new Error('Insercao de mensagem nao retornou registro.');
      return { message: toMessageRecord(row), ledgerBlockId: blockId, ledgerHash };
    });
  }

  public markConversationRead(
    context: RequestContext,
    conversationId: string,
  ): Promise<ConversationReadResponse> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<{ last_read_at: Date | string }>(
        `UPDATE communication.conversation_participants
            SET last_read_at = clock_timestamp()
          WHERE conversation_id = $1 AND user_id = $2
          RETURNING last_read_at`,
        [conversationId, context.userId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Conversa nao encontrada para o usuario.',
        });
      }
      return { conversationId, lastReadAt: toIso(row.last_read_at) };
    });
  }

  /** Empresa da conversa; ausencia de linha (RLS) vira NOT_FOUND. */
  private async conversationCompany(
    client: SqlClient,
    conversationId: string,
  ): Promise<string | null> {
    const result = await client.query<CompanyRow>(
      'SELECT company_id FROM communication.conversations WHERE id = $1',
      [conversationId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Conversa nao encontrada.',
      });
    }
    return row.company_id;
  }

  public listAnnouncements(context: RequestContext): Promise<AnnouncementRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<AnnouncementRow>(
        `${ANNOUNCEMENT_SELECT} ORDER BY a.published_at DESC`,
        [context.userId],
      );
      return result.rows.map(toAnnouncementRecord);
    });
  }

  public publishAnnouncement(
    context: RequestContext,
    input: PublishAnnouncementRequest,
  ): Promise<PublishAnnouncementResponse> {
    const id = randomUUID();
    const companyId =
      input.scope === 'COMPANY' ? (input.companyId ?? context.companyId ?? null) : null;
    if (input.scope === 'COMPANY' && companyId === null) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Comunicado de empresa exige companyId.',
      });
    }
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'communication.announcements',
        entityId: id,
        actionType: 'COMMUNICATION_ANNOUNCEMENT_PUBLISHED',
        payload: {
          scope: input.scope,
          severity: input.severity ?? 'INFO',
          title: input.title,
          companyId,
        },
      });
      const result = await client.query<Omit<AnnouncementRow, 'read'>>(
        `INSERT INTO communication.announcements(
           id, tenant_id, company_id, scope, severity, title, body, published_by,
           expires_at, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, company_id, scope, severity, title, body, published_by, published_at, expires_at`,
        [
          id,
          context.tenantId,
          companyId,
          input.scope,
          input.severity ?? 'INFO',
          input.title,
          input.body,
          context.userId,
          input.expiresAt ?? null,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de comunicado nao retornou registro.');
      return {
        announcement: toAnnouncementRecord({ ...row, read: false }),
        ledgerBlockId: blockId,
        ledgerHash,
      };
    });
  }

  public markAnnouncementRead(
    context: RequestContext,
    announcementId: string,
  ): Promise<AnnouncementReadResponse> {
    return this.database.withContext(context, async (client) => {
      await client.query(
        `INSERT INTO communication.announcement_reads(announcement_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (announcement_id, user_id) DO NOTHING`,
        [announcementId, context.userId],
      );
      const result = await client.query<{ read_at: Date | string }>(
        `SELECT read_at FROM communication.announcement_reads
          WHERE announcement_id = $1 AND user_id = $2`,
        [announcementId, context.userId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Comunicado nao encontrado para o usuario.',
        });
      }
      return { announcementId, readAt: toIso(row.read_at) };
    });
  }

  public listMail(context: RequestContext): Promise<MailRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<MailRow>(
        `SELECT ${MAIL_COLUMNS} FROM communication.mail_messages ORDER BY created_at DESC`,
      );
      return result.rows.map(toMailRecord);
    });
  }

  public queueMail(context: RequestContext, input: QueueMailRequest): Promise<QueueMailResponse> {
    const id = randomUUID();
    const fromAddress = process.env.MAIL_FROM_ADDRESS ?? 'nao-responda@vortex.com';
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      const ledgerHash = await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'communication.mail_messages',
        entityId: id,
        actionType: 'COMMUNICATION_MAIL_QUEUED',
        payload: {
          direction: 'OUT',
          toAddress: input.toAddress,
          subject: input.subject,
          relatedEntityType: input.relatedEntityType ?? null,
          relatedEntityId: input.relatedEntityId ?? null,
        },
      });
      const result = await client.query<MailRow>(
        `INSERT INTO communication.mail_messages(
           id, tenant_id, company_id, direction, from_address, to_address, subject, body,
           status, related_entity_type, related_entity_id, ledger_block_id)
         VALUES ($1, $2, $3, 'OUT', $4, $5, $6, $7, 'QUEUED', $8, $9, $10)
         RETURNING ${MAIL_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId ?? null,
          fromAddress,
          input.toAddress,
          input.subject,
          input.body,
          input.relatedEntityType ?? null,
          input.relatedEntityId ?? null,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de e-mail nao retornou registro.');
      return { mail: toMailRecord(row), ledgerBlockId: blockId, ledgerHash };
    });
  }

  public markMailRead(context: RequestContext, mailId: string): Promise<MailReadResponse> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<MailRow>(
        `UPDATE communication.mail_messages
            SET read_at = coalesce(read_at, clock_timestamp())
          WHERE id = $1 AND direction = 'IN'
          RETURNING ${MAIL_COLUMNS}`,
        [mailId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'E-mail de entrada nao encontrado.',
        });
      }
      return { mail: toMailRecord(row) };
    });
  }

  /** Alertas do Hub Preditivo lidos pela Central (mesmo estado do ERP). */
  public listAlerts(context: RequestContext): Promise<CommunicationAlerts> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<AlertRow>(
        `SELECT id, aircraft_id, item_id, code, severity, urgency, title, detail, updated_at
           FROM notifications.alerts
          WHERE resolved_at IS NULL
          ORDER BY
            CASE severity WHEN 'BLOCKING' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
            updated_at DESC`,
      );
      return result.rows.map((row) => ({
        id: row.id,
        aircraftId: row.aircraft_id,
        itemId: row.item_id,
        code: row.code,
        severity: row.severity,
        urgency: row.urgency,
        title: row.title,
        detail: row.detail,
        updatedAt: toIso(row.updated_at),
      }));
    });
  }
}
