import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { ComplianceService } from "./compliance.service.ts";
import { LgpdRequestDto } from "./compliance.dto.ts";

@Controller("compliance")
export class ComplianceController {
  public constructor(@Inject(ComplianceService) private readonly compliance: ComplianceService) {}

  @Get("lgpd")
  public list(@CurrentUser() user: RequestContext) {
    return this.compliance.list(user);
  }

  @Post("lgpd")
  public submit(@CurrentUser() user: RequestContext, @Body() dto: LgpdRequestDto) {
    return this.compliance.submit(user, dto);
  }

  @Get("mask")
  public mask(@Query("value") value: string) {
    return this.compliance.previewMask(value ?? "");
  }
}
