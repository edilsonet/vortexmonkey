import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  CalibrationStandard,
  NdtInspectorLevel,
  NdtMethod,
  OmCategory,
  PartCertification,
  PartCondition,
  PartTag,
  WorkOrderType,
} from '@vortex/contracts-be';

export class CreateMaintenanceOrgDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @MaxLength(100)
  comNumber!: string;

  @IsArray()
  categories!: OmCategory[];

  @IsOptional()
  @IsString()
  eoNumber?: string;
}

export class CreateAircraftDto {
  @IsString()
  @MaxLength(10)
  registration!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsString()
  @MaxLength(100)
  manufacturer!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCycles?: number;
}

export class CreateWorkOrderDto {
  @IsUUID()
  aircraftId!: string;

  @IsEnum(['PREVENTIVA', 'CORRETIVA', 'GRANDE_REPARO', 'GRANDE_ALTERACAO', 'INSPECAO', 'REVISAO'])
  workType!: WorkOrderType;

  @IsBoolean()
  isMajor!: boolean;

  @IsBoolean()
  requiresSegvoo!: boolean;

  @IsOptional()
  @IsString()
  technicalDataRef?: string;
}

export class AddWorkOrderTaskDto {
  @IsString()
  taskNumber!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  ataChapter?: string;

  @IsOptional()
  @IsString()
  manualRef?: string;

  @IsOptional()
  @IsUUID()
  usedToolId?: string;

  @IsOptional()
  @IsUUID()
  installedPartId?: string;
}

export class CloseWorkOrderDto {
  @IsUUID()
  inspectorId!: string;

  @IsUUID()
  signatureId!: string;

  @IsOptional()
  @IsString()
  segvoo001Id?: string;
}

export class RegisterPartDto {
  @IsString()
  partNumber!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsEnum(['NOVA', 'USADA_SERVICAVEL', 'USADA_NAO_SERVICAVEL', 'REVISADA', 'REPARADA'])
  condition!: PartCondition;

  @IsEnum(['VERDE_SERVICAVEL', 'AMARELA_REPARAVEL_INSPECAO', 'VERMELHA_CONDENADA_NAO_AERONAVEGAVEL'])
  tag!: PartTag;

  @IsEnum(['TC', 'STC', 'TSO', 'PMA', 'OTP', 'PADRAO'])
  certificationType!: PartCertification;

  @IsOptional()
  @IsString()
  form81303?: string;
}

export class RegisterToolDto {
  @IsString()
  identification!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  calibrationRequired!: boolean;

  @IsOptional()
  @IsEnum(['RBC_INMETRO', 'FABRICANTE_OEM', 'PADRAO_RASTREAVEL_INTERNACIONAL'])
  calibrationStandard?: CalibrationStandard;

  @IsOptional()
  @IsString()
  calibrationExpiry?: string;
}

export class LogNdtTestDto {
  @IsUUID()
  workOrderId!: string;

  @IsEnum(['LIQUIDO_PENETRANTE', 'PARTICULAS_MAGNETICAS', 'ULTRASSOM', 'RADIOGRAFIA', 'EDDY_CURRENT', 'VISUAL'])
  method!: NdtMethod;

  @IsUUID()
  inspectorId!: string;

  @IsEnum(['NIVEL_I', 'NIVEL_II', 'NIVEL_III'])
  inspectorLevel!: NdtInspectorLevel;

  @IsEnum(['APROVADO', 'REPROVADO', 'INCONCLUSIVO'])
  result!: 'APROVADO' | 'REPROVADO' | 'INCONCLUSIVO';

  @IsString()
  reportHash!: string;
}

export class ComplyAirworthinessDirectiveDto {
  @IsUUID()
  aircraftId!: string;

  @IsString()
  adNumber!: string;

  @IsBoolean()
  amocApproved!: boolean;

  @IsString()
  fcdaHash!: string;
}
