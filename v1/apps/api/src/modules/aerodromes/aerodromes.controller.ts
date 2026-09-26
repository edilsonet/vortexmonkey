import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import {
  CreateAerodromeDto,
  CreateFaunaEventDto,
  CreateFireResponseLogDto,
  CreateRunwayConditionReportDto,
  CreateRunwayPavementDto,
} from './aerodromes.dto';
import { AerodromesService } from './aerodromes.service';

@Controller('api/v1')
export class AerodromesController {
  public constructor(private readonly aerodromes: AerodromesService) {}

  /** POST /api/v1/aerodromes — Cadastra aeródromo (RBAC 153). */
  @Post('aerodromes')
  @RequireRoles('admin', 'supervisor')
  public registerAerodrome(@Req() req: Request, @Body() dto: CreateAerodromeDto): Promise<unknown> {
    return this.aerodromes.registerAerodrome(req.vortexContext!, dto);
  }

  /** GET /api/v1/aerodromes — Lista aeródromos. */
  @Get('aerodromes')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listAerodromes(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.listAerodromes(req.vortexContext!);
  }

  /** POST /api/v1/runway-pavement — Cadastra pavimento (IRI/macrotextura). */
  @Post('runway-pavement')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerRunwayPavement(@Req() req: Request, @Body() dto: CreateRunwayPavementDto): Promise<unknown> {
    return this.aerodromes.registerRunwayPavement(req.vortexContext!, dto);
  }

  /** GET /api/v1/runway-pavement — Lista pavimentos. */
  @Get('runway-pavement')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listRunwayPavement(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.listRunwayPavement(req.vortexContext!);
  }

  /** POST /api/v1/runway-condition-reports — Emite RCR por terço (T1/T2/T3) e envia à TWR. */
  @Post('runway-condition-reports')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createRunwayConditionReport(@Req() req: Request, @Body() dto: CreateRunwayConditionReportDto): Promise<unknown> {
    return this.aerodromes.createRunwayConditionReport(req.vortexContext!, dto);
  }

  /** GET /api/v1/runway-condition-reports — Lista RCRs. */
  @Get('runway-condition-reports')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listRunwayConditionReports(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.listRunwayConditionReports(req.vortexContext!);
  }

  /** POST /api/v1/fire-response-logs — Registra resposta SESCINC (máx. 3 min). */
  @Post('fire-response-logs')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createFireResponseLog(@Req() req: Request, @Body() dto: CreateFireResponseLogDto): Promise<unknown> {
    return this.aerodromes.createFireResponseLog(req.vortexContext!, dto);
  }

  /** GET /api/v1/fire-response-logs — Lista respostas de incêndio. */
  @Get('fire-response-logs')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listFireResponseLogs(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.listFireResponseLogs(req.vortexContext!);
  }

  /** POST /api/v1/fauna-events — Registra avistamento/colisão (SIGRA, R = log(x)). */
  @Post('fauna-events')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createFaunaEvent(@Req() req: Request, @Body() dto: CreateFaunaEventDto): Promise<unknown> {
    return this.aerodromes.createFaunaEvent(req.vortexContext!, dto);
  }

  /** GET /api/v1/fauna-events — Lista eventos de fauna. */
  @Get('fauna-events')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listFaunaEvents(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.listFaunaEvents(req.vortexContext!);
  }

  /** GET /api/v1/aerodromes/dashboard — KPIs do ERP 153. */
  @Get('aerodromes/dashboard')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getAerodromesDashboard(@Req() req: Request): Promise<unknown> {
    return this.aerodromes.getAerodromesDashboard(req.vortexContext!);
  }
}