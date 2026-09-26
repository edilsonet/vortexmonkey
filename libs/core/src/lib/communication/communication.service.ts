import { Injectable, inject } from '@angular/core';
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
} from '@vortex/shared-dto';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client.service';

/**
 * Acesso tipado as rotas da Central de Comunicacao (`ops-mro`).
 *
 * A Shell apenas le (contadores e listas). As acoes de fala (criar conversa,
 * enviar mensagem, publicar comunicado, enfileirar e-mail) ficam disponiveis
 * para os apps de dominio e para uma futura tela de composicao.
 */
@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly api = inject(ApiClient);

  summary(): Observable<CommunicationSummary> {
    return this.api.get<CommunicationSummary>('/communication/summary');
  }

  listConversations(): Observable<ConversationRecord[]> {
    return this.api.get<ConversationRecord[]>('/communication/conversations');
  }

  createConversation(body: CreateConversationRequest): Observable<CreateConversationResponse> {
    return this.api.post<CreateConversationResponse>('/communication/conversations', body);
  }

  listMessages(conversationId: string): Observable<MessageRecord[]> {
    return this.api.get<MessageRecord[]>(
      `/communication/conversations/${conversationId}/messages`,
    );
  }

  postMessage(conversationId: string, body: PostMessageRequest): Observable<PostMessageResponse> {
    return this.api.post<PostMessageResponse>(
      `/communication/conversations/${conversationId}/messages`,
      body,
    );
  }

  markConversationRead(conversationId: string): Observable<ConversationReadResponse> {
    return this.api.post<ConversationReadResponse>(
      `/communication/conversations/${conversationId}/read`,
    );
  }

  listAlerts(): Observable<CommunicationAlerts> {
    return this.api.get<CommunicationAlerts>('/communication/alerts');
  }

  listAnnouncements(): Observable<AnnouncementRecord[]> {
    return this.api.get<AnnouncementRecord[]>('/communication/announcements');
  }

  publishAnnouncement(
    body: PublishAnnouncementRequest,
  ): Observable<PublishAnnouncementResponse> {
    return this.api.post<PublishAnnouncementResponse>('/communication/announcements', body);
  }

  markAnnouncementRead(announcementId: string): Observable<AnnouncementReadResponse> {
    return this.api.post<AnnouncementReadResponse>(
      `/communication/announcements/${announcementId}/read`,
    );
  }

  listMail(): Observable<MailRecord[]> {
    return this.api.get<MailRecord[]>('/communication/mail');
  }

  queueMail(body: QueueMailRequest): Observable<QueueMailResponse> {
    return this.api.post<QueueMailResponse>('/communication/mail', body);
  }

  markMailRead(mailId: string): Observable<MailReadResponse> {
    return this.api.post<MailReadResponse>(`/communication/mail/${mailId}/read`);
  }
}
