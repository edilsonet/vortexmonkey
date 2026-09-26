import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public, RequireRoles } from '../../platform/security/security.decorators';
import { SignaturesService } from './signatures.service';
import { CreateSignatureRequestDto, SignDocumentDto } from './signatures.dto';

@Controller()
export class SignaturesController {
  public constructor(private readonly signatures: SignaturesService) {}

  /** Cria solicitação de assinatura para um documento. */
  @Post('signatures/requests')
  @RequireRoles('operator', 'admin', 'supervisor')
  public createRequest(@Req() req: Request, @Body() dto: CreateSignatureRequestDto): Promise<unknown> {
    return this.signatures.createRequest(req.vortexContext!, dto);
  }

  /** Executa a assinatura de um documento. */
  @Post('signatures/requests/:id/sign')
  @RequireRoles('operator', 'admin', 'supervisor')
  public sign(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignDocumentDto,
  ): Promise<unknown> {
    return this.signatures.sign(req.vortexContext!, id, dto);
  }

  /** Recupera detalhes de uma assinatura específica. */
  @Get('signatures/:id')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public getSignature(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.signatures.getSignature(req.vortexContext!, id);
  }

  /**
   * Verificação pública — sem autenticação.
   * GET /verify?code=VRTX-XXXX-XXXX&hash=<sha256-do-documento>
   */
  @Get('verify')
  @Public()
  public verify(
    @Query('code') code: string,
    @Query('hash') hash?: string,
  ): Promise<unknown> {
    return this.signatures.verifyPublic(code, hash);
  }
}
