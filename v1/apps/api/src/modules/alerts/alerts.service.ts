import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  PHASE_4_ALERT_EVENTS,
  type AlertSeverity,
  type AlertStatus,
} from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import type { CreateAlertDto, ResolveAlertDto } from './alerts.dto';

interface AlertRow {
  id: string; tenant_id: string; alert_type: string; severity: AlertSeverity;
  title: string; description: string | null; entity_type: string | null;
  entity_id: string | null; due_date: Date | null; status: AlertStatus;
  notification_key: string | null; ledger_block_id: string;
  created_at: Date; resolved_at: Date | null;
}

@Injectable()
export class AlertsService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  /** POST /alerts — Cria novo alerta preditivo com notificação idempotente */
  public async createAlert(context: RequestContext, dto: CreateAlertDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const notificationKey = dto.notificationKey || `${context.tenantId}:${dto.alertType}:${dto.entityId || 'global'}:${dto.dueDate || 'nodue'}`;

      const existing = (await client.query<AlertRow>(
        `SELECT * FROM notifications.alerts WHERE notification_key = $1`,
        [notificationKey],
      )).rows[0];

      if (existing) {
        return existing; // Idempotência: não duplica notificação
      }

      const alertId = randomUUID();
      const ledgerId = randomUUID();

      const result = await client.query<AlertRow>(
        `INSERT INTO notifications.alerts
          (id, tenant_id, alert_type, severity, title, description, entity_type, entity_id, due_date, status, notification_key, ledger_block_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ABERTO', $10, $11) RETURNING *`,
        [
          alertId, context.tenantId, dto.alertType, dto.severity, dto.title,
          dto.description ?? null, dto.entityType ?? null, dto.entityId ?? null,
          dto.dueDate ? new Date(dto.dueDate) : null, notificationKey, ledgerId,
        ],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'ALERT', entityId: alertId,
        actionType: PHASE_4_ALERT_EVENTS.ALERT_CREATED,
        payload: { alertId, alertType: dto.alertType, severity: dto.severity, title: dto.title, entityId: dto.entityId },
      });

      return result.rows[0];
    });
  }

  /** GET /alerts — Lista alertas com filtros opcionais */
  public async getAlerts(context: RequestContext, severity?: AlertSeverity, status?: AlertStatus): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      let query = `SELECT * FROM notifications.alerts WHERE tenant_id = $1`;
      const params: unknown[] = [context.tenantId];

      if (severity) {
        params.push(severity);
        query += ` AND severity = $${params.length}`;
      }

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      } else {
        query += ` AND status IN ('ABERTO','LIDO')`;
      }

      query += ` ORDER BY CASE severity WHEN 'BLOCKING' THEN 1 WHEN 'CRITICAL' THEN 2 WHEN 'WARNING' THEN 3 ELSE 4 END, created_at DESC LIMIT 100`;

      return (await client.query<AlertRow>(query, params)).rows;
    });
  }

  /** GET /alerts/summary — Alimenta os badges do sino da Shell */
  public async getSummary(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const rows = (await client.query<{ severity: AlertSeverity; count: string }>(
        `SELECT severity, COUNT(*) AS count
         FROM notifications.alerts
         WHERE tenant_id = $1 AND status IN ('ABERTO','LIDO')
         GROUP BY severity`,
        [context.tenantId],
      )).rows;

      const summary: Record<string, number> = {
        INFO: 0,
        WARNING: 0,
        CRITICAL: 0,
        BLOCKING: 0,
        totalOpen: 0,
      };

      for (const row of rows) {
        const count = Number(row.count);
        summary[row.severity] = count;
        summary.totalOpen = (summary.totalOpen ?? 0) + count;
      }

      return {
        tenantId: context.tenantId,
        badges: summary,
        hasBlockingAlerts: (summary.BLOCKING ?? 0) > 0,
      };
    });
  }

  /** POST /alerts/:id/read */
  public async markAsRead(context: RequestContext, alertId: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const alert = (await client.query<AlertRow>(
        `SELECT * FROM notifications.alerts WHERE id = $1 AND tenant_id = $2`,
        [alertId, context.tenantId],
      )).rows[0];

      if (!alert) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Alerta não encontrado.' });
      }

      if (alert.status === 'ABERTO') {
        await client.query(
          `UPDATE notifications.alerts SET status = 'LIDO' WHERE id = $1`,
          [alertId],
        );
      }

      return { alertId, status: 'LIDO' };
    });
  }

  /** POST /alerts/:id/resolve */
  public async resolveAlert(context: RequestContext, alertId: string, dto: ResolveAlertDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const alert = (await client.query<AlertRow>(
        `SELECT * FROM notifications.alerts WHERE id = $1 AND tenant_id = $2`,
        [alertId, context.tenantId],
      )).rows[0];

      if (!alert) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Alerta não encontrado.' });
      }

      const ledgerId = randomUUID();

      await client.query(
        `UPDATE notifications.alerts
         SET status = 'RESOLVED', resolved_at = now()
         WHERE id = $1`,
        [alertId],
      );

      await this.ledger.append(client, context, {
        id: ledgerId, entityType: 'ALERT', entityId: alertId,
        actionType: PHASE_4_ALERT_EVENTS.ALERT_RESOLVED,
        payload: { alertId, alertType: alert.alert_type, resolutionNote: dto.resolutionNote },
      });

      return { alertId, status: 'RESOLVED', resolvedAt: new Date() };
    });
  }
}
