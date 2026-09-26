import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationRepository } from './communication.repository';
import { CommunicationService } from './communication.service';

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationRepository],
  exports: [CommunicationRepository],
})
export class CommunicationModule {}
