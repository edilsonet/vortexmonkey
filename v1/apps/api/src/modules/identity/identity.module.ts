import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
@Module({ imports: [LedgerModule], controllers: [IdentityController], providers: [IdentityService] })
export class IdentityModule {}
