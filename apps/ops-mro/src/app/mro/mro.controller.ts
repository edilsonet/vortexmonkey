import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import type {
  AircraftAlert,
  AircraftComplianceResponse,
  AircraftRecord,
  AmortizationResponse,
  ComplianceAssessResponse,
  ComplianceItemRecord,
  CounterValidateResponse,
  CounterValueResponse,
  CreateAircraftResponse,
  CreateComplianceItemResponse,
  CreateMeterResetResponse,
  MeterReadingRecord,
  MeterResetRecord,
  RecordComplianceDoneResponse,
  RecordMeterReadingResponse,
  RequestContext,
  ResetRule,
  UtilizationResponse,
  WBAssessResponse,
} from '@vortex/shared-dto';
import { ContextGuard } from '../platform/http/context.guard';
import { VortexContext } from '../platform/http/request-context.decorator';
import { WriteRoute } from '../platform/http/write-route.decorator';
import {
  AmortizationRequestDto,
  ComplianceAssessRequestDto,
  CounterValidateRequestDto,
  CounterValueRequestDto,
  CreateAircraftDto,
  CreateComplianceItemDto,
  CreateComplianceResetRuleDto,
  CreateMeterResetDto,
  RecordComplianceDoneDto,
  RecordMeterReadingDto,
  UtilizationRequestDto,
  WBAssessRequestDto,
} from './mro.dto';
import { MroService } from './mro.service';

/**
 * Rotas do ERP Manutencao.
 *
 * SUFIXO `.../assess`, `/utilization`, `/counters/*`, `/amortization` e
 * `/weight-balance/assess`: CALCULO puro. Nao mutam estado, respondem 200 e nao
 * exigem Idempotency-Key.
 *
 * Demais rotas: persistencia. Exigem contexto e `Idempotency-Key` (regra 6) e
 * ancoram o bloco no ledger na mesma transacao (regra 1).
 *
 * O envelope `{ success, data, error }` e aplicado globalmente pelos
 * interceptores/filtro; os handlers devolvem o dado cru.
 */
@Controller('mro')
export class MroController {
  constructor(private readonly mro: MroService) {}

  // -------------------------------------------------------------------------
  // Calculo
  // -------------------------------------------------------------------------

  @Post('compliance/assess')
  @HttpCode(200)
  assessCompliance(@Body() body: ComplianceAssessRequestDto): ComplianceAssessResponse {
    return this.mro.assessCompliance(body);
  }

  @Post('utilization')
  @HttpCode(200)
  utilization(@Body() body: UtilizationRequestDto): UtilizationResponse {
    return this.mro.utilization(body);
  }

  @Post('weight-balance/assess')
  @HttpCode(200)
  assessWeightBalance(@Body() body: WBAssessRequestDto): WBAssessResponse {
    return this.mro.assessWeightBalance(body);
  }

  @Post('counters/value')
  @HttpCode(200)
  counterValue(@Body() body: CounterValueRequestDto): CounterValueResponse {
    return this.mro.counterValue(body);
  }

  @Post('counters/validate')
  @HttpCode(200)
  validateCounter(@Body() body: CounterValidateRequestDto): CounterValidateResponse {
    return this.mro.validateCounter(body);
  }

  @Post('amortization')
  @HttpCode(200)
  amortization(@Body() body: AmortizationRequestDto): AmortizationResponse {
    return this.mro.amortization(body);
  }

  // -------------------------------------------------------------------------
  // Aeronaves
  // -------------------------------------------------------------------------

  @Get('aircraft')
  @UseGuards(ContextGuard)
  listAircraft(@VortexContext() context: RequestContext): Promise<AircraftRecord[]> {
    return this.mro.listAircraft(context);
  }

  @Post('aircraft')
  @WriteRoute()
  createAircraft(
    @VortexContext() context: RequestContext,
    @Body() body: CreateAircraftDto,
  ): Promise<CreateAircraftResponse> {
    return this.mro.createAircraft(context, body);
  }

  @Get('aircraft/:aircraftId/meter-readings')
  @UseGuards(ContextGuard)
  listMeterReadings(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
  ): Promise<MeterReadingRecord[]> {
    return this.mro.listMeterReadings(context, aircraftId);
  }

  @Post('aircraft/:aircraftId/meter-readings')
  @WriteRoute()
  recordMeterReading(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
    @Body() body: RecordMeterReadingDto,
  ): Promise<RecordMeterReadingResponse> {
    return this.mro.recordMeterReading(context, aircraftId, body);
  }

  @Get('aircraft/:aircraftId/meter-resets')
  @UseGuards(ContextGuard)
  listMeterResets(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
  ): Promise<MeterResetRecord[]> {
    return this.mro.listMeterResets(context, aircraftId);
  }

  @Post('aircraft/:aircraftId/meter-resets')
  @WriteRoute()
  createMeterReset(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
    @Body() body: CreateMeterResetDto,
  ): Promise<CreateMeterResetResponse> {
    return this.mro.createMeterReset(context, aircraftId, body);
  }

  // -------------------------------------------------------------------------
  // Conformidade
  // -------------------------------------------------------------------------

  @Get('aircraft/:aircraftId/compliance-items')
  @UseGuards(ContextGuard)
  listComplianceItems(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
  ): Promise<ComplianceItemRecord[]> {
    return this.mro.listComplianceItems(context, aircraftId);
  }

  @Post('aircraft/:aircraftId/compliance-items')
  @WriteRoute()
  createComplianceItem(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
    @Body() body: CreateComplianceItemDto,
  ): Promise<CreateComplianceItemResponse> {
    return this.mro.createComplianceItem(context, aircraftId, body);
  }

  @Get('aircraft/:aircraftId/compliance/assess')
  @UseGuards(ContextGuard)
  assessAircraft(
    @VortexContext() context: RequestContext,
    @Param('aircraftId') aircraftId: string,
  ): Promise<AircraftComplianceResponse> {
    return this.mro.assessAircraft(context, aircraftId);
  }

  @Post('compliance/done')
  @WriteRoute()
  recordComplianceDone(
    @VortexContext() context: RequestContext,
    @Body() body: RecordComplianceDoneDto,
  ): Promise<RecordComplianceDoneResponse> {
    return this.mro.recordComplianceDone(context, body);
  }

  @Get('compliance/reset-rules')
  @UseGuards(ContextGuard)
  listResetRules(@VortexContext() context: RequestContext): Promise<ResetRule[]> {
    return this.mro.listResetRules(context);
  }

  @Post('compliance/reset-rules')
  @WriteRoute()
  createResetRule(
    @VortexContext() context: RequestContext,
    @Body() body: CreateComplianceResetRuleDto,
  ): Promise<ResetRule> {
    return this.mro.createResetRule(context, body);
  }

  // -------------------------------------------------------------------------
  // Alertas (Hub Preditivo)
  // -------------------------------------------------------------------------

  /**
   * Alertas correntes do Hub Preditivo. Derivados do ledger pelo consumidor de
   * eventos (`notifications.alerts`): e estado, nao historico.
   */
  @Get('alerts')
  @UseGuards(ContextGuard)
  listAlerts(@VortexContext() context: RequestContext): Promise<AircraftAlert[]> {
    return this.mro.listAlerts(context);
  }
}
