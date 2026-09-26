import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { AlertSeverity } from '@vortex/contracts-be';

export class CreateAlertDto {
  @IsString()
  alertType!: string;

  @IsEnum(['INFO', 'WARNING', 'CRITICAL', 'BLOCKING'])
  severity!: AlertSeverity;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notificationKey?: string;
}

export class ResolveAlertDto {
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
