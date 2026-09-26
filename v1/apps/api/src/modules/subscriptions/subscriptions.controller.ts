import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestContext } from '@vortex/types';
import { Public, RequireRoles } from '../../platform/security/security.decorators';
import {
  AddTenantUserDto,
  AsaasWebhookDto,
  CalculateCommissionDto,
  CreateSubscriptionDto,
  CreateTenantDto,
} from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  public constructor(private readonly subscriptions: SubscriptionsService) {}

  /** POST /subscriptions/tenants — Cria novo tenant */
  @Post('tenants')
  @RequireRoles('admin', 'supervisor')
  public createTenant(@Req() req: Request, @Body() dto: CreateTenantDto): Promise<unknown> {
    return this.subscriptions.createTenant(req.vortexContext!, dto);
  }

  /** POST /subscriptions/tenants/:id/users — Adiciona usuário a tenant */
  @Post('tenants/:id/users')
  @RequireRoles('admin', 'supervisor')
  public addUserToTenant(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Body() dto: AddTenantUserDto,
  ): Promise<unknown> {
    return this.subscriptions.addUserToTenant(req.vortexContext!, tenantId, dto);
  }

  /** POST /subscriptions — Assina plano (STARTER, PRO, ENTERPRISE) */
  @Post()
  @RequireRoles('admin', 'supervisor')
  public createSubscription(@Req() req: Request, @Body() dto: CreateSubscriptionDto): Promise<unknown> {
    return this.subscriptions.createSubscription(req.vortexContext!, dto);
  }

  /** GET /subscriptions/usage — Medição de eventos e consumo por tenant */
  @Get('usage')
  @RequireRoles('admin', 'supervisor', 'auditor', 'operator')
  public getUsage(@Req() req: Request, @Query('tenantId') tenantId: string): Promise<unknown> {
    const targetTenantId = tenantId || req.vortexContext!.tenantId;
    return this.subscriptions.getUsage(req.vortexContext!, targetTenantId);
  }

  /** POST /subscriptions/commission/calculate — Calcula comissão de 3% */
  @Post('commission/calculate')
  @RequireRoles('admin', 'supervisor', 'operator')
  public calculateCommission(@Body() dto: CalculateCommissionDto): unknown {
    return this.subscriptions.calculateCommission(dto);
  }

  /** POST /subscriptions/webhook/asaas — Webhook de cobrança recorrente (@Public com chave) */
  @Post('webhook/asaas')
  @Public()
  public handleAsaasWebhook(@Req() req: Request, @Body() dto: AsaasWebhookDto): Promise<unknown> {
    const context: RequestContext = req.vortexContext ?? {
      userId: 'system-asaas',
      tenantId: dto.tenantId,
      roles: ['SYSTEM'],
      scopes: ['system:write'],
      requestId: 'asaas-req',
    };
    return this.subscriptions.handleAsaasWebhook(context, dto);
  }
}
