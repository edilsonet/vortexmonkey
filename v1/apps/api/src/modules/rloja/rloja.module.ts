import { Module } from '@nestjs/common';
import { RlojaController } from './rloja.controller';
import { RlojaService } from './rloja.service';
import { DatabaseModule } from '../../platform/database/database.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [RlojaController],
  providers: [RlojaService],
  exports: [RlojaService],
})
export class RlojaModule {}
