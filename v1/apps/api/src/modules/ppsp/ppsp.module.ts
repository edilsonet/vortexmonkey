import { Module } from '@nestjs/common';
import { PpspController } from './ppsp.controller';
import { PpspService } from './ppsp.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [PpspController],
  providers: [PpspService],
  exports: [PpspService],
})
export class PpspModule {}
