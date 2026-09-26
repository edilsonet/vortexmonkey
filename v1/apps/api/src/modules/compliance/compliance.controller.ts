import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import { ComplianceService } from './compliance.service';
import { RequestErasureDto, RequestExportDto, RevokeConsentDto } from './compliance.dto';

@Controller('compliance')
export class ComplianceController {
  public constructor(private readonly compliance: ComplianceService) {}

  /**
   * POST /compliance/export — Solicita exportação de dados (portabilidade LGPD art. 18, V).
   * Retorna presigned URL do JSON exportado (1 hora).
   */
  @Post('export')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public requestExport(@Req() req: Request, @Body() dto: RequestExportDto): Promise<unknown> {
    return this.compliance.requestExport(req.vortexContext!, dto);
  }

  /** GET /compliance/exports/:id — Estado + URL de download da exportação. */
  @Get('exports/:id')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public getExport(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.compliance.getExport(req.vortexContext!, id);
  }

  /**
   * POST /compliance/erase — Solicita apagamento (anonimização) LGPD art. 18, VI.
   * Anonimiza dados pessoais. Ledger e registros regulatórios são PRESERVADOS.
   */
  @Post('erase')
  @RequireRoles('operator', 'admin', 'supervisor')
  public requestErasure(@Req() req: Request, @Body() dto: RequestErasureDto): Promise<unknown> {
    return this.compliance.requestErasure(req.vortexContext!, dto);
  }

  /** GET /compliance/erase/status — Lista requisições de apagamento do usuário. */
  @Get('erase/status')
  @RequireRoles('operator', 'admin', 'supervisor', 'auditor')
  public getEraseStatus(@Req() req: Request): Promise<unknown> {
    return this.compliance.getEraseStatus(req.vortexContext!);
  }

  /**
   * POST /compliance/consent/revoke — Revoga consentimento (LGPD art. 8º, §5º).
   */
  @Post('consent/revoke')
  @RequireRoles('operator', 'admin', 'supervisor')
  public revokeConsent(@Req() req: Request, @Body() dto: RevokeConsentDto): Promise<unknown> {
    return this.compliance.revokeConsent(req.vortexContext!, dto);
  }
}
