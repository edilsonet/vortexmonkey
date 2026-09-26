import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { CommunicationService } from "./communication.service.ts";
import { CreateAnnouncementDto, CreateMessageDto, CreateThreadDto } from "./communication.dto.ts";

@Controller("communication")
export class CommunicationController {
  public constructor(@Inject(CommunicationService) private readonly comm: CommunicationService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.comm.overview(user);
  }

  @Post("threads")
  public thread(@CurrentUser() user: RequestContext, @Body() dto: CreateThreadDto) {
    return this.comm.createThread(user, dto);
  }

  @Post("messages")
  public message(@CurrentUser() user: RequestContext, @Body() dto: CreateMessageDto) {
    return this.comm.sendMessage(user, dto);
  }

  @Post("announcements")
  public announce(@CurrentUser() user: RequestContext, @Body() dto: CreateAnnouncementDto) {
    return this.comm.announce(user, dto);
  }
}
