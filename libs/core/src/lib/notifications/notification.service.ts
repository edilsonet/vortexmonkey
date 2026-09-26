import { Injectable, inject } from '@angular/core';
import type {
  ListNotificationsResponse,
  NotificationReadResponse,
  UserNotificationRecord,
} from '@vortex/shared-dto';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../api/api-client.service';

/**
 * Acesso tipado as notificacoes diretas ao usuario (`ops-mro`).
 *
 * A Central de Comunicacao le os avisos da Shell por aqui. Nao existe escrita
 * publica: o aviso nasce de um evento interno de seguranca no backend.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiClient);

  list(): Observable<readonly UserNotificationRecord[]> {
    return this.api
      .get<ListNotificationsResponse>('/notifications')
      .pipe(map((response) => response.notifications));
  }

  markRead(notificationId: string): Observable<NotificationReadResponse> {
    return this.api.post<NotificationReadResponse>(`/notifications/${notificationId}/read`, {});
  }
}
