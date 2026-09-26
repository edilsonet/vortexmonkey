import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [LedgerModule, DocumentsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
