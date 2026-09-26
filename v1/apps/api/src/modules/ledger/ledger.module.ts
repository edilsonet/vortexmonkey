import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerIntegrityMonitor } from './ledger-integrity.monitor';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, LedgerIntegrityMonitor],
  exports: [LedgerService, LedgerIntegrityMonitor],
})
export class LedgerModule {}
