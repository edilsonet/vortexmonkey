import { Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { AlertsService } from "./alerts.service.ts";

@Controller("alerts")
export class AlertsController {
  public constructor(@Inject(AlertsService) private readonly alerts: AlertsService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.alerts.list(user);
  }

  @Get("badges")
  public badges(@CurrentUser() user: RequestContext) {
    return this.alerts.badges(user);
  }

  @Post(":id/ack")
  public ack(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.alerts.ack(user, id);
  }
}
