import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import { DocumentsService } from './documents.service';
import { GenerateSegvoo001Dto, InitiateUploadDto } from './documents.dto';

@Controller('documents')
export class DocumentsController {
  public constructor(private readonly documents: DocumentsService) {}

  /**
   * POST /documents/upload — Inicia upload: cria registro e retorna presigned URL.
   * Cliente faz PUT diretamente no MinIO.
   */
  @Post('upload')
  @RequireRoles('operator', 'admin', 'supervisor')
  public initiateUpload(@Req() req: Request, @Body() dto: InitiateUploadDto): Promise<unknown> {
    return this.documents.initiateUpload(req.vortexContext!, dto);
  }

  /** GET /documents/:id — Recupera metadados + presigned URL de download (5 min). */
  @Get(':id')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public getDocument(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.documents.getDocument(req.vortexContext!, id);
  }

  /** GET /documents/:id/versions — Lista todas as versões recuperáveis. */
  @Get(':id/versions')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public getVersions(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.documents.getVersions(req.vortexContext!, id);
  }

  /** POST /documents/:id/anonymize — Anonimiza dados pessoais (LGPD art. 18). */
  @Post(':id/anonymize')
  @RequireRoles('admin', 'supervisor')
  public anonymize(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.documents.anonymize(req.vortexContext!, id);
  }

  /** POST /documents/:id/segvoo-001 — Gera XML SEGVOO 001 regulatório. */
  @Post(':id/segvoo-001')
  @RequireRoles('operator', 'admin', 'supervisor')
  public generateSegvoo001(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateSegvoo001Dto,
  ): Promise<unknown> {
    return this.documents.generateSegvoo001(req.vortexContext!, id, dto);
  }
}
