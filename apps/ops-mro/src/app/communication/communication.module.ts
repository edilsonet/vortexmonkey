import { Module } from '@nestjs/common';
import { CommunicationGateway } from './communication.gateway';
import { CommunicationController } from './communication.controller';
import { CommunicationRepository } from './communication.repository';
import { CommunicationService } from './communication.service';

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationRepository, CommunicationGateway],
  exports: [CommunicationRepository, CommunicationGateway],
})
export class CommunicationModule {}
