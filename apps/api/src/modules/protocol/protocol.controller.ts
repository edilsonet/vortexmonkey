import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { ProtocolService } from "./protocol.service.ts";

@Controller("protocols")
export class ProtocolController {
  public constructor(@Inject(ProtocolService) private readonly protocol: ProtocolService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.protocol.list(user);
  }
}
