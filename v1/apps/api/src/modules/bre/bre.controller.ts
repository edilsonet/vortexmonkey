import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import { EvalRuleDto, ListRulesDto, UpdateRuleDto } from './bre.dto';
import { BreService } from './bre.service';

@Controller('api/v1')
export class BreController {
  public constructor(private readonly bre: BreService) {}

  /** GET /api/v1/bre/rules — Lista regras do BRE. */
  @Get('bre/rules')
  @RequireRoles('admin', 'supervisor', 'auditor')
  public listRules(@Req() req: Request, @Query() query: ListRulesDto): Promise<unknown> {
    return this.bre.listRules(req.vortexContext!, query);
  }

  /** POST /api/v1/bre/evaluate — Avalia uma regra contra um contexto. */
  @Post('bre/evaluate')
  @RequireRoles('admin', 'supervisor', 'operator')
  public evaluateRule(@Req() req: Request, @Body() dto: EvalRuleDto): Promise<unknown> {
    return this.bre.evaluateRule(req.vortexContext!, dto.rule_code, dto.context);
  }

  /** POST /api/v1/bre/rules/:code — Atualiza uma regra (admin). */
  @Post('bre/rules/:code')
  @RequireRoles('admin')
  public updateRule(
    @Req() req: Request,
    @Param('code') code: string,
    @Body() dto: UpdateRuleDto,
  ): Promise<unknown> {
    return this.bre.updateRule(req.vortexContext!, code, dto);
  }

  /** GET /api/v1/bre/dashboard — Dashboard de regras ativas. */
  @Get('bre/dashboard')
  @RequireRoles('admin', 'supervisor', 'auditor')
  public getDashboard(@Req() req: Request): Promise<unknown> {
    return this.bre.getDashboard(req.vortexContext!);
  }
}
