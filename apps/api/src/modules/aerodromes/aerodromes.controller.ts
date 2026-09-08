import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { AerodromesService } from "./aerodromes.service.ts";
import {
  CreateAerodromeDto,
  CreateFaunaDto,
  CreateFireDto,
  CreateMaintDto,
  CreatePavementDto,
  CreateRcrDto,
} from "./aerodromes.dto.ts";

@Controller("airport")
export class AerodromesController {
  public constructor(@Inject(AerodromesService) private readonly airport: AerodromesService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.airport.overview(user);
  }

  @Post("aerodromes")
  public aerodrome(@CurrentUser() user: RequestContext, @Body() dto: CreateAerodromeDto) {
    return this.airport.createAerodrome(user, dto);
  }

  @Post("pavement")
  public pavement(@CurrentUser() user: RequestContext, @Body() dto: CreatePavementDto) {
    return this.airport.createPavement(user, dto);
  }

  @Post("rcr")
  public rcr(@CurrentUser() user: RequestContext, @Body() dto: CreateRcrDto) {
    return this.airport.createRcr(user, dto);
  }

  @Post("sescinc")
  public fire(@CurrentUser() user: RequestContext, @Body() dto: CreateFireDto) {
    return this.airport.createFire(user, dto);
  }

  @Post("fauna")
  public fauna(@CurrentUser() user: RequestContext, @Body() dto: CreateFaunaDto) {
    return this.airport.createFauna(user, dto);
  }

  @Post("maintenance")
  public maint(@CurrentUser() user: RequestContext, @Body() dto: CreateMaintDto) {
    return this.airport.createMaint(user, dto);
  }
}
