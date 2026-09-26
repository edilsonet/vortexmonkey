import { Controller, Get, UseGuards } from '@nestjs/common';
import type { LedgerVerification, RequestContext } from '@vortex/shared-dto';
import { ContextGuard } from '../http/context.guard';
import { VortexContext } from '../http/request-context.decorator';
import { LedgerService } from './ledger.service';

/** Auditoria da cadeia do ledger. Leitura, portanto sem Idempotency-Key. */
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('verify')
  @UseGuards(ContextGuard)
  verify(@VortexContext() context: RequestContext): Promise<LedgerVerification> {
    return this.ledger.verifyChain(context);
  }
}
