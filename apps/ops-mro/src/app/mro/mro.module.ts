import { Module } from '@nestjs/common';
import { ComplianceAlertHandler } from './compliance-alert.handler';
import { MroController } from './mro.controller';
import { MroRepository } from './mro.repository';
import { MroService } from './mro.service';

@Module({
  controllers: [MroController],
  providers: [MroService, MroRepository, ComplianceAlertHandler],
})
export class MroModule {}
