import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { BillingService } from "./billing.service.ts";
import { SubscribeDto } from "./billing.dto.ts";

@Controller("billing")
export class BillingController {
  public constructor(@Inject(BillingService) private readonly billing: BillingService) {}

  @Get("products")
  public products() {
    return this.billing.products();
  }

  @Get("me")
  public mine(@CurrentUser() user: RequestContext) {
    return this.billing.mine(user);
  }

  @Post("subscribe")
  public subscribe(@CurrentUser() user: RequestContext, @Body() dto: SubscribeDto) {
    return this.billing.subscribe(user, dto);
  }

  @Get("commissions")
  public commissions(@CurrentUser() user: RequestContext) {
    return this.billing.commissions(user);
  }
}
