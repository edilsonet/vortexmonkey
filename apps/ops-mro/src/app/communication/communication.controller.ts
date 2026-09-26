import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type {
  AnnouncementReadResponse,
  AnnouncementRecord,
  CommunicationAlerts,
  CommunicationSummary,
  ConversationReadResponse,
  ConversationRecord,
  CreateConversationResponse,
  MailReadResponse,
  MailRecord,
  MessageRecord,
  PostMessageResponse,
  PublishAnnouncementResponse,
  QueueMailResponse,
  RequestContext,
} from '@vortex/shared-dto';
import { ContextGuard } from '../platform/http/context.guard';
import { VortexContext } from '../platform/http/request-context.decorator';
import { WriteRoute } from '../platform/http/write-route.decorator';
import {
  CreateConversationDto,
  PostMessageDto,
  PublishAnnouncementDto,
  QueueMailDto,
} from './communication.dto';
import { CommunicationService } from './communication.service';

/**
 * Central de Comunicacao (barra superior da Shell).
 *
 * `GET` exibem o estado corrente (badges e listas); `POST` sao escritas e
 * exigem contexto + `Idempotency-Key` (regra 6), ancorando o bloco no ledger na
 * mesma transacao (regra 1). A excecao sao as marcas d'agua de leitura, que sao
 * estado de consumo do usuario e nao geram bloco (ver migracao 0015).
 *
 * Publicar comunicado exige papel de administracao, verificado pelo RLS
 * (`identity.can_administer`): usuario sem papel recebe PERMISSION_DENIED (403).
 */
@Controller('communication')
export class CommunicationController {
  public constructor(private readonly communication: CommunicationService) {}

  /** Contadores dos badges da Shell. */
  @Get('summary')
  @UseGuards(ContextGuard)
  summary(@VortexContext() context: RequestContext): Promise<CommunicationSummary> {
    return this.communication.summary(context);
  }

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  @Get('conversations')
  @UseGuards(ContextGuard)
  listConversations(@VortexContext() context: RequestContext): Promise<ConversationRecord[]> {
    return this.communication.listConversations(context);
  }

  @Post('conversations')
  @WriteRoute()
  createConversation(
    @VortexContext() context: RequestContext,
    @Body() body: CreateConversationDto,
  ): Promise<CreateConversationResponse> {
    return this.communication.createConversation(context, body);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(ContextGuard)
  listMessages(
    @VortexContext() context: RequestContext,
    @Param('conversationId') conversationId: string,
  ): Promise<MessageRecord[]> {
    return this.communication.listMessages(context, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  @WriteRoute()
  postMessage(
    @VortexContext() context: RequestContext,
    @Param('conversationId') conversationId: string,
    @Body() body: PostMessageDto,
  ): Promise<PostMessageResponse> {
    return this.communication.postMessage(context, conversationId, body);
  }

  @Post('conversations/:conversationId/read')
  @WriteRoute()
  markConversationRead(
    @VortexContext() context: RequestContext,
    @Param('conversationId') conversationId: string,
  ): Promise<ConversationReadResponse> {
    return this.communication.markConversationRead(context, conversationId);
  }

  // -------------------------------------------------------------------------
  // Alertas (Hub Preditivo)
  // -------------------------------------------------------------------------

  @Get('alerts')
  @UseGuards(ContextGuard)
  listAlerts(@VortexContext() context: RequestContext): Promise<CommunicationAlerts> {
    return this.communication.listAlerts(context);
  }

  // -------------------------------------------------------------------------
  // Comunicados Oficiais
  // -------------------------------------------------------------------------

  @Get('announcements')
  @UseGuards(ContextGuard)
  listAnnouncements(@VortexContext() context: RequestContext): Promise<AnnouncementRecord[]> {
    return this.communication.listAnnouncements(context);
  }

  @Post('announcements')
  @WriteRoute()
  publishAnnouncement(
    @VortexContext() context: RequestContext,
    @Body() body: PublishAnnouncementDto,
  ): Promise<PublishAnnouncementResponse> {
    return this.communication.publishAnnouncement(context, body);
  }

  @Post('announcements/:announcementId/read')
  @WriteRoute()
  markAnnouncementRead(
    @VortexContext() context: RequestContext,
    @Param('announcementId') announcementId: string,
  ): Promise<AnnouncementReadResponse> {
    return this.communication.markAnnouncementRead(context, announcementId);
  }

  // -------------------------------------------------------------------------
  // Caixa de e-mails
  // -------------------------------------------------------------------------

  @Get('mail')
  @UseGuards(ContextGuard)
  listMail(@VortexContext() context: RequestContext): Promise<MailRecord[]> {
    return this.communication.listMail(context);
  }

  @Post('mail')
  @WriteRoute()
  queueMail(
    @VortexContext() context: RequestContext,
    @Body() body: QueueMailDto,
  ): Promise<QueueMailResponse> {
    return this.communication.queueMail(context, body);
  }

  @Post('mail/:mailId/read')
  @WriteRoute()
  markMailRead(
    @VortexContext() context: RequestContext,
    @Param('mailId') mailId: string,
  ): Promise<MailReadResponse> {
    return this.communication.markMailRead(context, mailId);
  }
}
