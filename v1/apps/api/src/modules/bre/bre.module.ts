import { Module } from '@nestjs/common';
import { BreController } from './bre.controller';
import { BreService } from './bre.service';
import { DatabaseModule } from '../../platform/database/database.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [BreController],
  providers: [BreService],
  exports: [BreService],
})
export class BreModule {}
