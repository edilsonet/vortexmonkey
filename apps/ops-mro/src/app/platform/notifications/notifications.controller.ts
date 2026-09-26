import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import type {
  ListNotificationsResponse,
  NotificationReadResponse,
  RequestContext,
} from '@vortex/shared-dto';
import { ContextGuard } from '../http/context.guard';
import { WriteRoute } from '../http/write-route.decorator';
import { VortexContext } from '../http/request-context.decorator';
import { NotificationsService } from './notifications.service';

/**
 * Notificacoes diretas ao usuario (aviso in-app).
 *
 * `GET` lista os avisos do usuario do contexto; `POST /:id/read` marca um como
 * lido (estado de consumo, sem bloco no ledger). Nao ha rota de criacao: o
 * aviso nasce de um evento interno de seguranca.
 */
@Controller('notifications')
export class NotificationsController {
  public constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @UseGuards(ContextGuard)
  public list(@VortexContext() context: RequestContext): Promise<ListNotificationsResponse> {
    return this.notifications.list(context);
  }

  @Post(':notificationId/read')
  @HttpCode(201)
  @WriteRoute()
  public markRead(
    @VortexContext() context: RequestContext,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
  ): Promise<NotificationReadResponse> {
    return this.notifications.markRead(context, notificationId);
  }
}
