import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { DocumentsService } from "./documents.service.ts";
import { AddVersionDto, InitiateUploadDto } from "./documents.dto.ts";

@Controller("documents")
export class DocumentsController {
  public constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.documents.list(user);
  }

  @Post("segvoo001")
  public segvoo(@CurrentUser() user: RequestContext, @Body() body: { aircraft: string; occurrence: string }) {
    return this.documents.segvoo001(user, body);
  }

  @Post()
  public create(@CurrentUser() user: RequestContext, @Body() dto: InitiateUploadDto) {
    return this.documents.initiateUpload(user, dto);
  }

  @Get(":id")
  public get(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.documents.get(user, id);
  }

  @Post(":id/versions")
  public version(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: AddVersionDto) {
    return this.documents.addVersion(user, id, dto);
  }

  @Post(":id/anonymize")
  public anonymize(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.documents.anonymize(user, id);
  }
}
