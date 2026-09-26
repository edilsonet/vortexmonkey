import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { LedgerService } from "./ledger.service.ts";

@Controller("ledger")
export class LedgerController {
  public constructor(@Inject(LedgerService) private readonly ledger: LedgerService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.ledger.list(user);
  }

  @Get("verify")
  public verify() {
    return this.ledger.verify();
  }
}
