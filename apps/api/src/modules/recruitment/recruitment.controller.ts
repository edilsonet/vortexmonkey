import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { RecruitmentService } from "./recruitment.service.ts";
import { ApplyDto, CreateVacancyDto, HireDto } from "./recruitment.dto.ts";

@Controller("recruitment")
export class RecruitmentController {
  public constructor(@Inject(RecruitmentService) private readonly recruitment: RecruitmentService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.recruitment.list(user);
  }

  @Post("vacancies")
  public create(@CurrentUser() user: RequestContext, @Body() dto: CreateVacancyDto) {
    return this.recruitment.create(user, dto);
  }

  @Post("apply")
  public apply(@CurrentUser() user: RequestContext, @Body() dto: ApplyDto) {
    return this.recruitment.apply(user, dto);
  }

  @Post("hire")
  public hire(@CurrentUser() user: RequestContext, @Body() dto: HireDto) {
    return this.recruitment.hire(user, dto);
  }
}
