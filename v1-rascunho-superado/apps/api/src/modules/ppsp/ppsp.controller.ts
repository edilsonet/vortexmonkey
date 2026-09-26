import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { PpspService } from "./ppsp.service.ts";
import { AddMemberDto, CreateProgramDto, DrawDto, RecordExamDto } from "./ppsp.dto.ts";

@Controller("ppsp")
export class PpspController {
  public constructor(@Inject(PpspService) private readonly ppsp: PpspService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.ppsp.list(user);
  }

  @Post("programs")
  public create(@CurrentUser() user: RequestContext, @Body() dto: CreateProgramDto) {
    return this.ppsp.createProgram(user, dto);
  }

  @Post("programs/:id/members")
  public member(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: AddMemberDto) {
    return this.ppsp.addMember(user, id, dto);
  }

  @Post("exams")
  public exam(@CurrentUser() user: RequestContext, @Body() dto: RecordExamDto) {
    return this.ppsp.recordExam(user, dto);
  }

  @Post("programs/:id/draw")
  public draw(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: DrawDto) {
    return this.ppsp.draw(user, id, dto);
  }
}
