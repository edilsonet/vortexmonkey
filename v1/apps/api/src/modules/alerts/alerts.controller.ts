import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AlertSeverity, AlertStatus } from '@vortex/contracts-be';
import { RequireRoles } from '../../platform/security/security.decorators';
import { CreateAlertDto, ResolveAlertDto } from './alerts.dto';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  public constructor(private readonly alerts: AlertsService) {}

  /** POST /alerts — Cria alerta preditivo */
  @Post()
  @RequireRoles('admin', 'supervisor', 'operator')
  public createAlert(@Req() req: Request, @Body() dto: CreateAlertDto): Promise<unknown> {
    return this.alerts.createAlert(req.vortexContext!, dto);
  }

  /** GET /alerts — Lista alertas com filtros */
  @Get()
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getAlerts(
    @Req() req: Request,
    @Query('severity') severity?: AlertSeverity,
    @Query('status') status?: AlertStatus,
  ): Promise<unknown> {
    return this.alerts.getAlerts(req.vortexContext!, severity, status);
  }

  /** GET /alerts/summary — Alimenta o resumo de badges da Shell */
  @Get('summary')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getSummary(@Req() req: Request): Promise<unknown> {
    return this.alerts.getSummary(req.vortexContext!);
  }

  /** POST /alerts/:id/read — Marca alerta como lido */
  @Post(':id/read')
  @RequireRoles('admin', 'supervisor', 'operator')
  public markAsRead(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.alerts.markAsRead(req.vortexContext!, id);
  }

  /** POST /alerts/:id/resolve — Resolve alerta */
  @Post(':id/resolve')
  @RequireRoles('admin', 'supervisor', 'operator')
  public resolveAlert(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
  ): Promise<unknown> {
    return this.alerts.resolveAlert(req.vortexContext!, id, dto);
  }
}
