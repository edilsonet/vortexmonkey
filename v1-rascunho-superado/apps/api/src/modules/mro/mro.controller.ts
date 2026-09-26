import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { MroService } from "./mro.service.ts";
import {
  AdvanceWorkOrderDto,
  ComplyAdDto,
  CreateAdDto,
  CreateAircraftDto,
  CreateManualDto,
  CreateOmDto,
  CreatePartDto,
  CreateToolDto,
  CreateWorkOrderDto,
} from "./mro.dto.ts";

@Controller("mro")
export class MroController {
  public constructor(@Inject(MroService) private readonly mro: MroService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.mro.overview(user);
  }

  @Post("organizations")
  public om(@CurrentUser() user: RequestContext, @Body() dto: CreateOmDto) {
    return this.mro.createOm(user, dto);
  }

  @Post("aircraft")
  public aircraft(@CurrentUser() user: RequestContext, @Body() dto: CreateAircraftDto) {
    return this.mro.createAircraft(user, dto);
  }

  @Post("work-orders")
  public wo(@CurrentUser() user: RequestContext, @Body() dto: CreateWorkOrderDto) {
    return this.mro.createWorkOrder(user, dto);
  }

  @Post("work-orders/:id/advance")
  public advance(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: AdvanceWorkOrderDto) {
    return this.mro.advance(user, id, dto);
  }

  @Post("work-orders/:id/crs")
  public crs(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.mro.issueCrs(user, id);
  }

  @Post("parts")
  public part(@CurrentUser() user: RequestContext, @Body() dto: CreatePartDto) {
    return this.mro.createPart(user, dto);
  }

  @Post("tools")
  public tool(@CurrentUser() user: RequestContext, @Body() dto: CreateToolDto) {
    return this.mro.createTool(user, dto);
  }

  @Post("ads")
  public ad(@CurrentUser() user: RequestContext, @Body() dto: CreateAdDto) {
    return this.mro.createAd(user, dto);
  }

  @Post("ads/:id/comply")
  public comply(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: ComplyAdDto) {
    return this.mro.complyAd(user, id, dto);
  }

  @Post("manuals")
  public manual(@CurrentUser() user: RequestContext, @Body() dto: CreateManualDto) {
    return this.mro.createManual(user, dto);
  }
}
