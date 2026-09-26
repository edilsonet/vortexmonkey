import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import {
  AddFleetDto,
  CreateAirOperatorDto,
  CreateDispatchReleaseDto,
  CreateLogbookEntryDto,
  CreateMelItemDto,
  CreateOperationalManualDto,
  DeferMelItemDto,
  EndorseLogbookEntryDto,
  RecordCvaDto,
  RectifyLogbookEntryDto,
  RegisterAgriOperatorDto,
  RegisterDisperserDto,
  ReleaseDispatchDto,
  SignLogbookEntryDto,
  ValidateDispatchReleaseDto,
  VoidLogbookEntryDto,
} from './operators.dto';
import { OperatorsService } from './operators.service';

@Controller('api/v1')
export class OperatorsController {
  public constructor(private readonly operators: OperatorsService) {}

  /** POST /api/v1/air-operators — Cadastra operador aéreo (RBAC 91/119/121/135/137). */
  @Post('air-operators')
  @RequireRoles('admin', 'supervisor')
  public registerAirOperator(@Req() req: Request, @Body() dto: CreateAirOperatorDto): Promise<unknown> {
    return this.operators.registerAirOperator(req.vortexContext!, dto);
  }

  /** GET /api/v1/air-operators — Lista operadores. */
  @Get('air-operators')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listAirOperators(@Req() req: Request): Promise<unknown> {
    return this.operators.listAirOperators(req.vortexContext!);
  }

  /** POST /api/v1/operator-fleet — Vincula aeronave à frota. */
  @Post('operator-fleet')
  @RequireRoles('admin', 'supervisor', 'operator')
  public addOperatorFleet(@Req() req: Request, @Body() dto: AddFleetDto): Promise<unknown> {
    return this.operators.addOperatorFleet(req.vortexContext!, dto);
  }

  /** GET /api/v1/operator-fleet — Lista frota. */
  @Get('operator-fleet')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listOperatorFleet(@Req() req: Request): Promise<unknown> {
    return this.operators.listOperatorFleet(req.vortexContext!);
  }

  /** POST /api/v1/mel-items — Cadastra item MEL (IS 91-012). */
  @Post('mel-items')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createMelItem(@Req() req: Request, @Body() dto: CreateMelItemDto): Promise<unknown> {
    return this.operators.createMelItem(req.vortexContext!, dto);
  }

  /** GET /api/v1/mel-items — Lista itens MEL. */
  @Get('mel-items')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listMelItems(@Req() req: Request): Promise<unknown> {
    return this.operators.listMelItems(req.vortexContext!);
  }

  /** POST /api/v1/mel-items/:id/defer — Diferir item com prazo por categoria (DA prevalece). */
  @Post('mel-items/:id/defer')
  @RequireRoles('admin', 'supervisor', 'operator')
  public deferMelItem(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeferMelItemDto,
  ): Promise<unknown> {
    return this.operators.deferMelItem(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/logbook-entries — Lança registro no logbook digital. */
  @Post('logbook-entries')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createLogbookEntry(@Req() req: Request, @Body() dto: CreateLogbookEntryDto): Promise<unknown> {
    return this.operators.createLogbookEntry(req.vortexContext!, dto);
  }

  /** GET /api/v1/logbook-entries — Lista lançamentos. */
  @Get('logbook-entries')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listLogbookEntries(@Req() req: Request): Promise<unknown> {
    return this.operators.listLogbookEntries(req.vortexContext!);
  }

  /** POST /api/v1/logbook-entries/:id/sign — Assinatura digital obrigatória. */
  @Post('logbook-entries/:id/sign')
  @RequireRoles('admin', 'supervisor', 'operator')
  public signLogbookEntry(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignLogbookEntryDto,
  ): Promise<unknown> {
    return this.operators.signLogbookEntry(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/logbook-entries/:id/endorse — Endosso de instrutor + envio DBE. */
  @Post('logbook-entries/:id/endorse')
  @RequireRoles('admin', 'supervisor')
  public endorseLogbookEntry(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndorseLogbookEntryDto,
  ): Promise<unknown> {
    return this.operators.endorseLogbookEntry(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/logbook-entries/:id/rectify — Retificação com nova versão. */
  @Post('logbook-entries/:id/rectify')
  @RequireRoles('admin', 'supervisor', 'operator')
  public rectifyLogbookEntry(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RectifyLogbookEntryDto,
  ): Promise<unknown> {
    return this.operators.rectifyLogbookEntry(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/logbook-entries/:id/void — Anulação com motivo. */
  @Post('logbook-entries/:id/void')
  @RequireRoles('admin', 'supervisor')
  public voidLogbookEntry(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidLogbookEntryDto,
  ): Promise<unknown> {
    return this.operators.voidLogbookEntry(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/dispatch-releases — Cria liberação de despacho. */
  @Post('dispatch-releases')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createDispatchRelease(@Req() req: Request, @Body() dto: CreateDispatchReleaseDto): Promise<unknown> {
    return this.operators.createDispatchRelease(req.vortexContext!, dto);
  }

  /** GET /api/v1/dispatch-releases — Lista liberações. */
  @Get('dispatch-releases')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listDispatchReleases(@Req() req: Request): Promise<unknown> {
    return this.operators.listDispatchReleases(req.vortexContext!);
  }

  /** POST /api/v1/dispatch-releases/:id/validate — Valida combustível, met, P&B, MEL, DA, CVA, repeso e ETOPS. */
  @Post('dispatch-releases/:id/validate')
  @RequireRoles('admin', 'supervisor', 'operator')
  public validateDispatchRelease(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateDispatchReleaseDto,
  ): Promise<unknown> {
    return this.operators.validateDispatchRelease(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/dispatch-releases/:id/release — Libera com assinatura DOV. */
  @Post('dispatch-releases/:id/release')
  @RequireRoles('admin', 'supervisor', 'operator')
  public releaseDispatch(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseDispatchDto,
  ): Promise<unknown> {
    return this.operators.releaseDispatch(req.vortexContext!, id, dto);
  }

  /** POST /api/v1/operational-manuals — Cadastra manual operacional. */
  @Post('operational-manuals')
  @RequireRoles('admin', 'supervisor')
  public createOperationalManual(@Req() req: Request, @Body() dto: CreateOperationalManualDto): Promise<unknown> {
    return this.operators.createOperationalManual(req.vortexContext!, dto);
  }

  /** GET /api/v1/operational-manuals — Lista manuais. */
  @Get('operational-manuals')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listOperationalManuals(@Req() req: Request): Promise<unknown> {
    return this.operators.listOperationalManuals(req.vortexContext!);
  }

  /** POST /api/v1/agri-operators — Cadastra operador aeroagrícola (CDAG). */
  @Post('agri-operators')
  @RequireRoles('admin', 'supervisor')
  public registerAgriOperator(@Req() req: Request, @Body() dto: RegisterAgriOperatorDto): Promise<unknown> {
    return this.operators.registerAgriOperator(req.vortexContext!, dto);
  }

  /** GET /api/v1/agri-operators — Lista operadores aeroagrícolas. */
  @Get('agri-operators')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listAgriOperators(@Req() req: Request): Promise<unknown> {
    return this.operators.listAgriOperators(req.vortexContext!);
  }

  /** POST /api/v1/dispersers — Cadastra dispersor (calibração + DGPS). */
  @Post('dispersers')
  @RequireRoles('admin', 'supervisor', 'operator')
  public registerDisperser(@Req() req: Request, @Body() dto: RegisterDisperserDto): Promise<unknown> {
    return this.operators.registerDisperser(req.vortexContext!, dto);
  }

  /** GET /api/v1/dispersers/expiring — Dispersores com calibração vencendo (30 dias). */
  @Get('dispersers/expiring')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public listExpiringDispersers(@Req() req: Request): Promise<unknown> {
    return this.operators.listExpiringDispersers(req.vortexContext!);
  }

  /** POST /api/v1/aircraft/:id/cva — Registra CVA (extensão IS 91-403-001). */
  @Post('aircraft/:id/cva')
  @RequireRoles('admin', 'supervisor')
  public recordCva(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordCvaDto,
  ): Promise<unknown> {
    return this.operators.recordCva(req.vortexContext!, id, dto);
  }

  /** GET /api/v1/operators/dashboard — KPIs do ERP de Operadores. */
  @Get('operators/dashboard')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor')
  public getDashboard(@Req() req: Request): Promise<unknown> {
    return this.operators.getDashboard(req.vortexContext!);
  }
}