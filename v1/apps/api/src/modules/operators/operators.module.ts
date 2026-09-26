import { Module } from '@nestjs/common';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}