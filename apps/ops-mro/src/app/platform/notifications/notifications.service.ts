import { Injectable, Logger } from '@nestjs/common';
import type {
  ListNotificationsResponse,
  NotificationReadResponse,
  RequestContext,
} from '@vortex/shared-dto';
import { CommunicationRepository } from '../../communication/communication.repository';
import { CommunicationGateway } from '../../communication/communication.gateway';
import { NotificationsRepository } from './notifications.repository';

/** Contexto e dispositivo de um reuso de refresh token detectado. */
export interface RefreshTokenReuseInput {
  readonly userId: string;
  readonly tenantId: string;
  readonly companyId: string | null;
  readonly familyId: string | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

/**
 * Notificacoes diretas ao usuario.
 *
 * A criacao e interna (nao ha rota publica de escrita): nasce de um evento de
 * seguranca. O aviso de reuso e BEST-EFFORT — se o e-mail ou o aviso in-app
 * falharem, a resposta de autenticacao (401) nao pode ser mascarada por isso.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  public constructor(
    private readonly repository: NotificationsRepository,
    private readonly communication: CommunicationRepository,
    private readonly gateway: CommunicationGateway,
  ) {}

  public async list(context: RequestContext): Promise<ListNotificationsResponse> {
    return { notifications: await this.repository.list(context) };
  }

  public markRead(
    context: RequestContext,
    notificationId: string,
  ): Promise<NotificationReadResponse> {
    return this.repository.markRead(context, notificationId);
  }

  /**
   * Avisa o dono da sessao que um refresh token ja usado foi reapresentado.
   *
   * A familia ja foi revogada pelo banco (`REUSE_DETECTED`, migracao 0017); o
   * que falta e o usuario saber. Gera o aviso in-app e o e-mail transacional
   * informando o dispositivo/IP da tentativa, para que ele troque a senha se
   * nao reconhecer a origem.
   */
  public async notifyRefreshTokenReuse(input: RefreshTokenReuseInput): Promise<void> {
    const context: RequestContext = {
      userId: input.userId,
      tenantId: input.tenantId,
      companyId: input.companyId,
    };
    const origin = this.describeOrigin(input);
    try {
      const notification = await this.repository.create(context, {
        code: 'SESSION_REUSE_DETECTED',
        severity: 'CRITICAL',
        title: 'Sessao encerrada por seguranca',
        body:
          `Detectamos o reaparecimento de um token de sessao ja utilizado${origin}. ` +
          'Por seguranca, todas as sessoes dessa familia foram encerradas. ' +
          'Se nao foi voce, troque sua senha imediatamente.',
        relatedEntityType: 'identity.session_family',
        relatedEntityId: input.familyId,
      });
      // Aviso em tempo real: o usuario pode estar com a Shell aberta.
      this.gateway.emitNotice(context.userId, notification);

      const email = await this.repository.userEmail(context);
      if (email !== null) {
        await this.communication.queueMail(context, {
          toAddress: email,
          subject: 'VORTEX: sessao encerrada por seguranca',
          body:
            `Detectamos o reaparecimento de um token de sessao ja utilizado${origin}. ` +
            'Encerramos todas as sessoes dessa familia por seguranca. ' +
            'Se nao foi voce, troque sua senha imediatamente e revise os acessos.',
          relatedEntityType: 'identity.session_family',
          relatedEntityId: input.familyId,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao avisar o usuario ${input.userId} sobre reuso de refresh token: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private describeOrigin(input: RefreshTokenReuseInput): string {
    const parts: string[] = [];
    if (input.ipAddress) parts.push(`IP ${input.ipAddress}`);
    if (input.userAgent) parts.push(`dispositivo ${input.userAgent.slice(0, 120)}`);
    return parts.length === 0 ? '' : ` (${parts.join(', ')})`;
  }
}
