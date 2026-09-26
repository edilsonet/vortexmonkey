import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import { LogToxicologicalExamDto, RegisterArsoDto, TriggerRandomTestDto } from './ppsp.dto';
import { PpspService } from './ppsp.service';

@Controller('arso-personnel')
export class PpspController {
  public constructor(private readonly ppsp: PpspService) {}

  /** POST /arso-personnel — Cadastra profissional como ARSO (RBAC 120) */
  @Post()
  @RequireRoles('admin', 'supervisor')
  public registerArso(@Req() req: Request, @Body() dto: RegisterArsoDto): Promise<unknown> {
    return this.ppsp.registerArso(req.vortexContext!, dto);
  }

  /** GET /arso-personnel — Lista pessoal ARSO do tenant */
  @Get()
  @RequireRoles('admin', 'supervisor', 'auditor', 'operator')
  public getArsoPersonnel(@Req() req: Request): Promise<unknown> {
    return this.ppsp.getArsoPersonnel(req.vortexContext!);
  }

  /** GET /arso-personnel/expiring — Identifica exames toxicológicos com 15 dias de antecedência ou vencidos */
  @Get('expiring')
  @RequireRoles('admin', 'supervisor', 'auditor')
  public getExpiringArso(@Req() req: Request): Promise<unknown> {
    return this.ppsp.getExpiringArso(req.vortexContext!);
  }

  /** POST /arso-personnel/random-test — Executa sorteio aleatório inopinado auditável */
  @Post('random-test')
  @RequireRoles('admin', 'supervisor')
  public drawRandomTestSample(@Req() req: Request, @Body() dto: TriggerRandomTestDto): Promise<unknown> {
    return this.ppsp.drawRandomTestSample(req.vortexContext!, dto);
  }

  /** POST /toxicological-exams — Registra exame toxicológico de janela longa (90 dias) */
  @Post('../toxicological-exams')
  @RequireRoles('admin', 'supervisor')
  public logToxicologicalExam(@Req() req: Request, @Body() dto: LogToxicologicalExamDto): Promise<unknown> {
    return this.ppsp.logToxicologicalExam(req.vortexContext!, dto);
  }
}
