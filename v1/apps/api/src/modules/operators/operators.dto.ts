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
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  AircraftCategory,
  CertificationPhase,
  DisperserType,
  FlightRule,
  LogbookEntryType,
  LogbookPilotFuncao,
  ManualType,
  MelCategory,
  OperatorType,
} from '@vortex/contracts-be';

export class CreateAirOperatorDto {
  @IsUUID()
  companyId!: string;

  @IsEnum(['RBAC_91', 'RBAC_121', 'RBAC_135', 'RBAC_137'])
  operatorType!: OperatorType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coaNumber?: string;

  @IsOptional()
  @IsDateString()
  coaValidity?: string;

  @IsOptional()
  @IsEnum(['SIMPLES', 'PADRAO'])
  classification?: 'SIMPLES' | 'PADRAO';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eoNumber?: string;

  @IsOptional()
  @IsEnum(['FASE_1', 'FASE_2', 'FASE_3', 'FASE_4', 'FASE_5', 'CERTIFICADO'])
  certificationPhase?: CertificationPhase;

  @IsOptional()
  @IsBoolean()
  etopsApproved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  etopsDiversionMinutes?: number;
}

export class AddFleetDto {
  @IsUUID()
  operatorId!: string;

  @IsUUID()
  aircraftId!: string;

  @IsString()
  @MaxLength(10)
  registration!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsOptional()
  @IsEnum(['AVIAO', 'HELICOPTERO', 'JATO', 'TURBOELICE'])
  aircraftCategory?: AircraftCategory;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPassengers?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTakeoffWeightKg?: number;

  @IsOptional()
  @IsDateString()
  lastReweighDate?: string;
}

export class CreateMelItemDto {
  @IsUUID()
  aircraftId!: string;

  @IsString()
  @MaxLength(10)
  ataChapter!: string;

  @IsString()
  @MaxLength(255)
  itemDescription!: string;

  @IsEnum(['CAT_A', 'CAT_B', 'CAT_C', 'CAT_D'])
  category!: MelCategory;

  @IsOptional()
  @IsString()
  procedureO?: string;

  @IsOptional()
  @IsString()
  procedureM?: string;
}

export class DeferMelItemDto {
  @IsOptional()
  @IsDateString()
  deferralDeadline?: string;

  @IsOptional()
  @IsString()
  procedureO?: string;
}

export class CreateLogbookEntryDto {
  @IsUUID()
  aircraftId!: string;

  @IsEnum(['flight', 'ground_run'])
  entryType!: LogbookEntryType;

  @IsDateString()
  entryDate!: string;

  @IsDateString()
  entryTimeUtc!: string;

  @IsString()
  @MaxLength(10)
  departureAerodrome!: string;

  @IsString()
  @MaxLength(10)
  arrivalAerodrome!: string;

  @IsDateString()
  takeoffTime!: string;

  @IsDateString()
  landingTime!: string;

  @IsNumber()
  @Min(0)
  flightTimeHours!: number;

  @IsString()
  @MaxLength(10)
  habilitacao!: string;

  @IsString()
  @MaxLength(50)
  modelo!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pousos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  diurno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  noturno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  navegacao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  instrumento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capota?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  simulador?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  milhasNavegacao?: number;

  @IsOptional()
  @IsBoolean()
  tpx?: boolean;

  @IsOptional()
  @IsBoolean()
  experimental?: boolean;

  @IsNumber()
  @Min(0)
  airframeHoursIncrement!: number;

  @IsInt()
  @Min(0)
  airframeCyclesIncrement!: number;

  @IsOptional()
  @IsNumber()
  engine1Hours?: number;

  @IsOptional()
  @IsInt()
  engine1Cycles?: number;

  @IsOptional()
  @IsNumber()
  engine2Hours?: number;

  @IsOptional()
  @IsInt()
  engine2Cycles?: number;

  @IsOptional()
  @IsNumber()
  propeller1Hours?: number;

  @IsOptional()
  @IsNumber()
  propeller2Hours?: number;

  @IsOptional()
  @IsNumber()
  apuHours?: number;

  @IsOptional()
  @IsInt()
  apuCycles?: number;

  @IsOptional()
  @IsString()
  discrepancies?: string;

  @IsOptional()
  @IsString()
  melCdlReference?: string;

  @IsUUID()
  pilotPersonId!: string;

  @IsString()
  @MaxLength(255)
  pilotName!: string;

  @IsString()
  @MaxLength(50)
  pilotLicense!: string;

  @IsEnum(['PIC', 'SIC', 'INSP', 'INSTR'])
  pilotFuncao!: LogbookPilotFuncao;
}

export class SignLogbookEntryDto {
  @IsDateString()
  signatureTimestamp!: string;

  @IsString()
  @MaxLength(255)
  signatureIdentity!: string;

  @IsString()
  attestationText!: string;
}

export class EndorseLogbookEntryDto {
  @IsUUID()
  endossadoPor!: string;

  @IsOptional()
  @IsBoolean()
  dbeEnviado?: boolean;
}

export class RectifyLogbookEntryDto {
  @IsString()
  rectificationReason!: string;
}

export class VoidLogbookEntryDto {
  @IsString()
  voidedReason!: string;
}

export class MetObservationDto {
  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @IsOptional()
  @IsNumber()
  qnhHpa?: number;

  @IsOptional()
  @IsNumber()
  windVariationPct?: number;
}

export class CreateDispatchReleaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  flightNumber?: string;

  @IsUUID()
  aircraftId!: string;

  @IsString()
  @MaxLength(10)
  departure!: string;

  @IsString()
  @MaxLength(10)
  destination!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternates?: string[];

  @IsEnum(['VFR', 'IFR'])
  flightRule!: FlightRule;

  @IsBoolean()
  isNight!: boolean;

  @IsInt()
  @Min(0)
  fuelPlannedMinutes!: number;

  @IsBoolean()
  metValid!: boolean;

  @IsBoolean()
  weightBalanceValid!: boolean;

  @IsUUID()
  dooId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  etopsDiversionMinutes?: number;
}

export class ValidateDispatchReleaseDto {
  @IsOptional()
  @IsNumber()
  maxTemperatureForecastC?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MetObservationDto)
  met?: MetObservationDto;
}

export class ReleaseDispatchDto {
  @IsUUID()
  signatureId!: string;
}

export class CreateOperationalManualDto {
  @IsUUID()
  operatorId!: string;

  @IsEnum(['MGO', 'AOM', 'MCMSV', 'MGM', 'PTO', 'SOP', 'MIP'])
  manualType!: ManualType;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  anacProcessNumber?: string;
}

export class RegisterAgriOperatorDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cdagNumber?: string;

  @IsOptional()
  @IsDateString()
  cdagValidity?: string;

  @IsOptional()
  @IsUUID()
  technicalManagerId?: string;
}

export class RegisterDisperserDto {
  @IsUUID()
  aircraftId!: string;

  @IsEnum(['SOLIDOS', 'LIQUIDOS', 'GRANULARES'])
  disperserType!: DisperserType;

  @IsDateString()
  calibrationExpiry!: string;

  @IsOptional()
  @IsBoolean()
  emcTestDone?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  circuitBreakers?: string[];

  @IsBoolean()
  dgpsInstalled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dgpsConformityDeclaration?: string;
}

export class RecordCvaDto {
  @IsString()
  @MaxLength(100)
  cvaNumber!: string;

  @IsDateString()
  cvaValidity!: string;
}