import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { ProfessionalService } from "./professional.service.ts";
import { CreateCivDto, CreateCmaDto, CreateExperienceDto, UpsertProfileDto } from "./professional.dto.ts";

@Controller("professional")
export class ProfessionalController {
  public constructor(@Inject(ProfessionalService) private readonly professional: ProfessionalService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.professional.overview(user);
  }

  @Post("profile")
  public upsert(@CurrentUser() user: RequestContext, @Body() dto: UpsertProfileDto) {
    return this.professional.upsertProfile(user, dto);
  }

  @Post("civ")
  public civ(@CurrentUser() user: RequestContext, @Body() dto: CreateCivDto) {
    return this.professional.addCiv(user, dto);
  }

  @Post("cma")
  public cma(@CurrentUser() user: RequestContext, @Body() dto: CreateCmaDto) {
    return this.professional.addCma(user, dto);
  }

  @Post("experiences")
  public experience(@CurrentUser() user: RequestContext, @Body() dto: CreateExperienceDto) {
    return this.professional.addExperience(user, dto);
  }
}
