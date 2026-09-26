import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { BreService } from "./bre.service.ts";
import { EvaluateRuleDto } from "./bre.dto.ts";

@Controller("bre")
export class BreController {
  public constructor(@Inject(BreService) private readonly bre: BreService) {}

  @Get("rules")
  public rules(@CurrentUser() user: RequestContext) {
    return this.bre.rules(user);
  }

  @Post("evaluate")
  public evaluate(@CurrentUser() user: RequestContext, @Body() dto: EvaluateRuleDto) {
    return this.bre.evaluate(user, dto);
  }
}
