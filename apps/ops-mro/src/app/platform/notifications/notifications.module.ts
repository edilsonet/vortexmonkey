import { Global, Module } from '@nestjs/common';
import { CommunicationModule } from '../../communication/communication.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

/**
 * Notificacoes diretas ao usuario. Global para que o `AuthService` (modulo
 * global) possa avisar sobre reuso de refresh token sem acoplar o modulo de
 * autenticacao a Central de Comunicacao.
 */
@Global()
@Module({
  imports: [CommunicationModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
