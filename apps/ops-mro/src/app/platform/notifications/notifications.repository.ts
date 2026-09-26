import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  NotificationReadResponse,
  RequestContext,
  UserNotificationRecord,
} from '@vortex/shared-dto';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { LedgerService } from '../ledger/ledger.service';

interface NotificationRow {
  id: string;
  tenant_id: string;
  company_id: string | null;
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: Date | string;
  read_at: Date | string | null;
}

const NOTIFICATION_COLUMNS = `id, tenant_id, company_id, code, severity, title, body,
  related_entity_type, related_entity_id, created_at, read_at`;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export interface CreateNotificationInput {
  readonly code: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
  readonly title: string;
  readonly body: string;
  readonly relatedEntityType?: string | null;
  readonly relatedEntityId?: string | null;
}

function toRecord(row: NotificationRow): UserNotificationRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    companyId: row.company_id,
    code: row.code,
    severity: row.severity,
    title: row.title,
    body: row.body,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    createdAt: toIso(row.created_at),
    readAt: row.read_at === null ? null : toIso(row.read_at),
  };
}

/**
 * Persistencia das notificacoes diretas ao usuario.
 *
 * A criacao ancora um bloco no ledger na MESMA transacao (regra 1). O RLS do
 * `withContext` garante que so o proprio usuario le e escreve; `user_id` e
 * sempre o do contexto, nunca um destinatario arbitrario. Marcar como lida e
 * estado de consumo e NAO gera bloco (ver migracao 0019).
 */
@Injectable()
export class NotificationsRepository {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  public create(
    context: RequestContext,
    input: CreateNotificationInput,
  ): Promise<UserNotificationRecord> {
    const id = randomUUID();
    return this.database.withContext(context, async (client) => {
      const blockId = randomUUID();
      await this.ledger.append(client, context, {
        id: blockId,
        entityType: 'notifications.user_notifications',
        entityId: id,
        actionType: 'NOTIFICATION_RAISED',
        payload: { code: input.code, severity: input.severity, title: input.title },
      });
      const result = await client.query<NotificationRow>(
        `INSERT INTO notifications.user_notifications(
           id, tenant_id, company_id, user_id, code, severity, title, body,
           related_entity_type, related_entity_id, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${NOTIFICATION_COLUMNS}`,
        [
          id,
          context.tenantId,
          context.companyId ?? null,
          context.userId,
          input.code,
          input.severity,
          input.title,
          input.body,
          input.relatedEntityType ?? null,
          input.relatedEntityId ?? null,
          blockId,
        ],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Insercao de notificacao nao retornou registro.');
      return toRecord(row);
    });
  }

  public list(context: RequestContext): Promise<UserNotificationRecord[]> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<NotificationRow>(
        `SELECT ${NOTIFICATION_COLUMNS}
           FROM notifications.user_notifications
          ORDER BY created_at DESC`,
      );
      return result.rows.map(toRecord);
    });
  }

  public markRead(
    context: RequestContext,
    notificationId: string,
  ): Promise<NotificationReadResponse> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<{ read_at: Date | string }>(
        `UPDATE notifications.user_notifications
            SET read_at = coalesce(read_at, clock_timestamp())
          WHERE id = $1
          RETURNING read_at`,
        [notificationId],
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Notificacao nao encontrada para o usuario.',
        });
      }
      return { notificationId, readAt: toIso(row.read_at) };
    });
  }

  /** E-mail do usuario do contexto (RLS: so o proprio). `null` se ausente. */
  public userEmail(context: RequestContext): Promise<string | null> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query<{ email: string }>(
        'SELECT email FROM identity.users WHERE id = $1',
        [context.userId],
      );
      return result.rows[0]?.email ?? null;
    });
  }
}
