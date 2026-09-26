import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import type { FaunaEventType, FireCategory, RwyccValue } from '@vortex/contracts-be';

export class CreateAerodromeDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @MaxLength(4)
  icaoCode!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsEnum(['CAT_1', 'CAT_2', 'CAT_3', 'CAT_4', 'CAT_5', 'CAT_6', 'CAT_7', 'CAT_8', 'CAT_9', 'CAT_10'])
  fireCategory?: FireCategory;

  @IsOptional()
  @IsDateString()
  fireCategoryValidity?: string;
}

export class CreateRunwayPavementDto {
  @IsUUID()
  aerodromeId!: string;

  @IsString()
  @MaxLength(10)
  runwayDesignator!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pcn?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iriMKm?: number; // ≤ 2,5 m/km

  @IsOptional()
  @IsNumber()
  @Min(0)
  macrotextureMm?: number; // ≥ 0,60 mm

  @IsOptional()
  @IsNumber()
  @Min(0)
  frictionCoefficient?: number;

  @IsOptional()
  @IsDateString()
  lastInspection?: string;
}

export class CreateRunwayConditionReportDto {
  @IsUUID()
  aerodromeId!: string;

  @IsString()
  @MaxLength(10)
  runwayDesignator!: string;

  @IsDateString()
  reportTime!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  rwyccT1!: RwyccValue;

  @IsInt()
  @Min(0)
  @Max(6)
  rwyccT2!: RwyccValue;

  @IsInt()
  @Min(0)
  @Max(6)
  rwyccT3!: RwyccValue;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contaminants?: string[];

  @IsOptional()
  @IsBoolean()
  sendToTwr?: boolean;
}

export class CreateFireResponseLogDto {
  @IsUUID()
  aerodromeId!: string;

  @IsString()
  @MaxLength(50)
  incidentType!: string;

  @IsDateString()
  alarmTime!: string;

  @IsDateString()
  agentApplicationTime!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fireVehicles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extinguishingAgents?: string[];

  @IsOptional()
  @IsBoolean()
  observerPresent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateFaunaEventDto {
  @IsUUID()
  aerodromeId!: string;

  @IsEnum(['AVISTAMENTO', 'COLISAO'])
  eventType!: FaunaEventType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sightings?: number; // x na fórmula R = log(x)

  @IsOptional()
  @IsBoolean()
  sendToSigra?: boolean;
}