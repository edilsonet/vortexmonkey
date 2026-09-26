import { Module } from '@nestjs/common';
import { AerodromesController } from './aerodromes.controller';
import { AerodromesService } from './aerodromes.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [AerodromesController],
  providers: [AerodromesService],
  exports: [AerodromesService],
})
export class AerodromesModule {}