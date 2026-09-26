import { Global, Module } from "@nestjs/common";
import { LedgerService } from "./ledger.service.ts";
import { LedgerController } from "./ledger.controller.ts";

@Global()
@Module({ controllers: [LedgerController], providers: [LedgerService], exports: [LedgerService] })
export class LedgerModule {}
