import { Body, Controller, Get, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../../platform/security/current-user.ts";
import { Public } from "../../platform/security/public.decorator.ts";
import type { RequestContext } from "@vortex/types";
import { SignaturesService } from "./signatures.service.ts";
import { CreateSignatureRequestDto, SignDocumentDto } from "./signatures.dto.ts";

@Controller()
export class SignaturesController {
  public constructor(@Inject(SignaturesService) private readonly signatures: SignaturesService) {}

  @Get("signatures/providers")
  public providers() {
    return this.signatures.listProviders();
  }

  @Get("signatures")
  public list(@CurrentUser() user: RequestContext) {
    return this.signatures.list(user);
  }

  @Post("signatures/requests")
  public request(@CurrentUser() user: RequestContext, @Body() dto: CreateSignatureRequestDto) {
    return this.signatures.createRequest(user, dto);
  }

  @Post("signatures/sign")
  public sign(@CurrentUser() user: RequestContext, @Body() dto: SignDocumentDto, @Req() req: Request) {
    return this.signatures.sign(user, dto, {
      ip: req.ip,
      ua: req.header("user-agent"),
    });
  }

  @Public()
  @Get("verify/:code")
  public verify(@Param("code") code: string) {
    return this.signatures.verifyPublic(code);
  }
}
