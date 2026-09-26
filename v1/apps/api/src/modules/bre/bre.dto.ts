import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

const RULE_SEVERITIES = ['BLOCKING', 'CRITICAL', 'WARNING', 'INFO'] as const;
const RULE_STATUSES = ['ACTIVE', 'DISABLED', 'TEST'] as const;

export class ListRulesDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(RULE_SEVERITIES)
  @IsOptional()
  severity?: string;
}

export class EvalRuleDto {
  @IsString()
  @IsNotEmpty()
  rule_code!: string;

  @IsObject()
  @IsNotEmpty()
  context!: Record<string, unknown>;
}

export class UpdateRuleDto {
  @IsEnum(RULE_SEVERITIES)
  @IsOptional()
  severity?: string;

  @IsEnum(RULE_STATUSES)
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  params?: Record<string, unknown>;
}
