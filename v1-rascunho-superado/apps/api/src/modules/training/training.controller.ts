import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { TrainingService } from "./training.service.ts";
import {
  CreateCenterDto,
  CreateCourseDto,
  CreateFstdDto,
  CreateInstructorDto,
  EnrollStudentDto,
  SessionDto,
} from "./training.dto.ts";

@Controller("training")
export class TrainingController {
  public constructor(@Inject(TrainingService) private readonly training: TrainingService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.training.overview(user);
  }

  @Post("centers")
  public center(@CurrentUser() user: RequestContext, @Body() dto: CreateCenterDto) {
    return this.training.createCenter(user, dto);
  }

  @Post("courses")
  public course(@CurrentUser() user: RequestContext, @Body() dto: CreateCourseDto) {
    return this.training.createCourse(user, dto);
  }

  @Post("students")
  public enroll(@CurrentUser() user: RequestContext, @Body() dto: EnrollStudentDto) {
    return this.training.enroll(user, dto);
  }

  @Post("students/:id/graduate")
  public graduate(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.training.graduate(user, id);
  }

  @Post("fstd")
  public fstd(@CurrentUser() user: RequestContext, @Body() dto: CreateFstdDto) {
    return this.training.createFstd(user, dto);
  }

  @Post("fstd/sessions")
  public session(@CurrentUser() user: RequestContext, @Body() dto: SessionDto) {
    return this.training.session(user, dto);
  }

  @Post("instructors")
  public instructor(@CurrentUser() user: RequestContext, @Body() dto: CreateInstructorDto) {
    return this.training.createInstructor(user, dto);
  }
}
