/**
 * Contratos HTTP das notificacoes ao usuario.
 *
 * Diferente do Hub Preditivo (`notifications.alerts`, por aeronave/item), a
 * notificacao e DIRETA ao usuario: e o aviso in-app de um evento que o afeta
 * (ex.: sessao encerrada por reuso de refresh token). O conteudo e ancorado no
 * ledger; o `readAt` e estado de consumo do usuario e nao gera bloco.
 *
 * Datas sao strings ISO 8601.
 */

import type { AlertSeverity } from './aeronautics';

export interface UserNotificationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;
  readonly createdAt: string;
  readonly readAt: string | null;
}

/** Resposta de `GET /api/notifications` (avisos do usuario do contexto). */
export interface ListNotificationsResponse {
  readonly notifications: readonly UserNotificationRecord[];
}

/** Resposta de `POST /api/notifications/:id/read`. */
export interface NotificationReadResponse {
  readonly notificationId: string;
  readonly readAt: string;
}
