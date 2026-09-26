import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { ProtocolController } from './protocol.controller';
import { ProtocolService } from './protocol.service';

@Module({ imports: [LedgerModule], controllers: [ProtocolController], providers: [ProtocolService], exports: [ProtocolService] })
export class ProtocolModule {}
