import { Injectable, Logger } from '@nestjs/common';
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
import { CommunicationRepository } from './communication.repository';
import { CommunicationGateway } from './communication.gateway';

/**
 * Central de Comunicacao: orquestra a leitura/exibicao dos registros e a
 * ancoragem no ledger dos atos de fala (conversa, mensagem, comunicado, e-mail).
 * Nao guarda estado proprio — a verdade esta no banco e no ledger.
 */
@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  public constructor(
    private readonly repository: CommunicationRepository,
    private readonly gateway: CommunicationGateway,
  ) {}

  public summary(context: RequestContext): Promise<CommunicationSummary> {
    return this.repository.summary(context);
  }

  public listConversations(context: RequestContext): Promise<ConversationRecord[]> {
    return this.repository.listConversations(context);
  }

  public createConversation(
    context: RequestContext,
    input: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    return this.repository.createConversation(context, input).then((response) => {
      // Aviso pos-commit (best-effort): o registro ja esta no ledger/banco.
      this.gateway.emitConversation(
        [context.userId, ...(input.participantUserIds ?? [])],
        response.conversation,
      );
      return response;
    });
  }

  public listMessages(context: RequestContext, conversationId: string): Promise<MessageRecord[]> {
    return this.repository.listMessages(context, conversationId);
  }

  public postMessage(
    context: RequestContext,
    conversationId: string,
    input: PostMessageRequest,
  ): Promise<PostMessageResponse> {
    return this.repository.postMessage(context, conversationId, input).then((response) => {
      void this.pushMessage(context, response.message);
      return response;
    });
  }

  public markConversationRead(
    context: RequestContext,
    conversationId: string,
  ): Promise<ConversationReadResponse> {
    return this.repository.markConversationRead(context, conversationId);
  }

  public listAnnouncements(context: RequestContext): Promise<AnnouncementRecord[]> {
    return this.repository.listAnnouncements(context);
  }

  public publishAnnouncement(
    context: RequestContext,
    input: PublishAnnouncementRequest,
  ): Promise<PublishAnnouncementResponse> {
    return this.repository.publishAnnouncement(context, input).then((response) => {
      this.gateway.emitAnnouncement(context, response.announcement);
      return response;
    });
  }

  public markAnnouncementRead(
    context: RequestContext,
    announcementId: string,
  ): Promise<AnnouncementReadResponse> {
    return this.repository.markAnnouncementRead(context, announcementId);
  }

  public listMail(context: RequestContext): Promise<MailRecord[]> {
    return this.repository.listMail(context);
  }

  public queueMail(context: RequestContext, input: QueueMailRequest): Promise<QueueMailResponse> {
    return this.repository.queueMail(context, input);
  }

  public markMailRead(context: RequestContext, mailId: string): Promise<MailReadResponse> {
    return this.repository.markMailRead(context, mailId);
  }

  public listAlerts(context: RequestContext): Promise<CommunicationAlerts> {
    return this.repository.listAlerts(context);
  }

  /** Destinatarios da conversa (RLS) e push; falha de aviso nao afeta a escrita. */
  private async pushMessage(context: RequestContext, message: MessageRecord): Promise<void> {
    try {
      const participants = await this.repository.participantUserIds(context, message.conversationId);
      this.gateway.emitMessage(participants, message);
    } catch (error) {
      this.logger.warn(
        `Mensagem ${message.id} sem aviso em tempo real: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
