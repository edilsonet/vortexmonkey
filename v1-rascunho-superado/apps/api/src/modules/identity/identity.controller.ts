import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { IdentityService } from "./identity.service.ts";
import { ConfirmRelationshipDto, CreateCompanyDto, CreateRelationshipDto, SetValidationDto } from "./identity.dto.ts";

@Controller("identity")
export class IdentityController {
  public constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  @Get("me")
  public me(@CurrentUser() user: RequestContext) {
    return this.identity.me(user);
  }

  @Get("dashboard")
  public dashboard(@CurrentUser() user: RequestContext) {
    return this.identity.dashboard(user);
  }

  @Post("companies")
  public createCompany(@CurrentUser() user: RequestContext, @Body() dto: CreateCompanyDto) {
    return this.identity.createCompany(user, dto);
  }

  @Post("relationships")
  public createRelationship(@CurrentUser() user: RequestContext, @Body() dto: CreateRelationshipDto) {
    return this.identity.createRelationship(user, dto);
  }

  @Post("relationships/:id/confirm")
  public confirm(
    @CurrentUser() user: RequestContext,
    @Param("id") id: string,
    @Body() dto: ConfirmRelationshipDto,
  ) {
    return this.identity.confirmRelationship(user, id, dto);
  }

  @Post("validations")
  public setValidation(@CurrentUser() user: RequestContext, @Body() dto: SetValidationDto) {
    return this.identity.setValidation(user, dto);
  }
}
