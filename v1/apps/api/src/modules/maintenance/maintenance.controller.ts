import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import {
  AddWorkOrderTaskDto,
  CloseWorkOrderDto,
  ComplyAirworthinessDirectiveDto,
  CreateAircraftDto,
  CreateMaintenanceOrgDto,
  CreateWorkOrderDto,
  LogNdtTestDto,
  RegisterPartDto,
  RegisterToolDto,
} from './maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@Controller()
export class MaintenanceController {
  public constructor(private readonly maintenance: MaintenanceService) {}

  /** POST /maintenance-organizations — Cadastra OM (RBAC 145) */
  @Post('maintenance-organizations')
  @RequireRoles('admin', 'supervisor')
  public registerMaintenanceOrg(@Req() req: Request, @Body() dto: CreateMaintenanceOrgDto): Promise<unknown> {
    return this.maintenance.registerMaintenanceOrg(req.vortexContext!, dto);
  }

  /** POST /aircraft — Cadastra aeronave */
  @Post('aircraft')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerAircraft(@Req() req: Request, @Body() dto: CreateAircraftDto): Promise<unknown> {
    return this.maintenance.registerAircraft(req.vortexContext!, dto);
  }

  /** POST /work-orders — Cria Ordem de Serviço (Etapa 1) */
  @Post('work-orders')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createWorkOrder(@Req() req: Request, @Body() dto: CreateWorkOrderDto): Promise<unknown> {
    return this.maintenance.createWorkOrder(req.vortexContext!, dto);
  }

  /** POST /work-orders/:id/tasks — Adiciona tarefa com travas regulatórias */
  @Post('work-orders/:id/tasks')
  @RequireRoles('admin', 'supervisor', 'operator')
  public addWorkOrderTask(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWorkOrderTaskDto,
  ): Promise<unknown> {
    return this.maintenance.addWorkOrderTask(req.vortexContext!, id, dto);
  }

  /** POST /work-orders/:id/step — Avança etapas da OS (1 a 12) */
  @Post('work-orders/:id/step')
  @RequireRoles('admin', 'supervisor', 'operator')
  public advanceStep(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('step') step: number,
  ): Promise<unknown> {
    return this.maintenance.advanceStep(req.vortexContext!, id, step);
  }

  /** POST /work-orders/:id/close — Emite CRS/APRS e encerra a OS (Travas 1, 4 e 5) */
  @Post('work-orders/:id/close')
  @RequireRoles('admin', 'supervisor')
  public closeWorkOrder(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseWorkOrderDto,
  ): Promise<unknown> {
    return this.maintenance.closeWorkOrder(req.vortexContext!, id, dto);
  }

  /** POST /parts-inventory — Cadastra e realiza triagem de peças (Etiquetas 🟢/🟡/🔴) */
  @Post('parts-inventory')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerPart(@Req() req: Request, @Body() dto: RegisterPartDto): Promise<unknown> {
    return this.maintenance.registerPart(req.vortexContext!, dto);
  }

  /** POST /tools — Cadastra e monitora calibração de ferramentas */
  @Post('tools')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerTool(@Req() req: Request, @Body() dto: RegisterToolDto): Promise<unknown> {
    return this.maintenance.registerTool(req.vortexContext!, dto);
  }

  /** POST /non-destructive-tests — Emite laudo de Ensaios Não Destrutivos (END) */
  @Post('non-destructive-tests')
  @RequireRoles('admin', 'supervisor', 'operator')
  public logNdtTest(@Req() req: Request, @Body() dto: LogNdtTestDto): Promise<unknown> {
    return this.maintenance.logNdtTest(req.vortexContext!, dto);
  }

  /** POST /airworthiness-directives/:id/comply — Cumpre Diretriz de Aeronavegabilidade (FCDA) */
  @Post('airworthiness-directives/:id/comply')
  @RequireRoles('admin', 'supervisor')
  public complyAirworthinessDirective(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComplyAirworthinessDirectiveDto,
  ): Promise<unknown> {
    return this.maintenance.complyAirworthinessDirective(req.vortexContext!, id, dto);
  }

  /** GET /maintenance/dashboard — KPIs do ERP 43+145 */
  @Get('maintenance/dashboard')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getDashboard(@Req() req: Request): Promise<unknown> {
    return this.maintenance.getDashboard(req.vortexContext!);
  }
}
