import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTOs de transporte do ERP Manutencao. Sao a camada de validacao da borda: o
 * `ValidationPipe` global rejeita corpo malformado com VALIDATION_ERROR (422),
 * em vez de deixar o erro estourar como 500. Os contratos canonicos (formas que
 * o Angular consome) permanecem em `@vortex/shared-dto`.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REGISTRATION = /^[A-Z]{2}-?[A-Z0-9]{3,5}$/i;

// ---------------------------------------------------------------------------
// Calculo (sem persistencia)
// ---------------------------------------------------------------------------

export class MeterReadingDto {
  @Matches(ISO_DATE, { message: 'date deve ser YYYY-MM-DD.' })
  date!: string;

  @IsOptional() @IsNumber() @Min(0) tach?: number | null;
  @IsOptional() @IsNumber() @Min(0) hobbs?: number | null;
  @IsOptional() @IsNumber() @Min(0) airframe?: number | null;
  @IsOptional() @IsBoolean() estimated?: boolean;
}

export class MeterResetDto {
  @IsIn(['tach', 'hobbs']) meter!: 'tach' | 'hobbs';
  @Matches(ISO_DATE) resetDate!: string;
}

export class UtilizationRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeterReadingDto)
  readings!: MeterReadingDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MeterResetDto)
  resets?: MeterResetDto[];

  @IsOptional() @Matches(ISO_DATE) today?: string;
  @IsOptional() @IsNumber() hoursRemaining?: number | null;
}

export class IntervalDto {
  @IsOptional() @IsInt() @Min(1) months?: number | null;
  @IsOptional() @IsNumber() @Min(0.01) hours?: number | null;
  @IsOptional() @IsInt() @Min(1) cycles?: number | null;
}

export class ComplianceItemDto {
  @IsString() @MaxLength(100) id!: string;
  @IsString() @MaxLength(60) kind!: string;
  @IsString() @MaxLength(255) label!: string;
  // Campos abaixo sao obrigatorios no contrato de dominio, mas o transporte
  // pode omiti-los: os defaults reproduzem o comportamento do motor.
  @IsOptional() @IsBoolean() regulatory = true;

  @IsObject() @ValidateNested() @Type(() => IntervalDto) interval!: IntervalDto;

  @IsOptional() @IsIn(['exact', 'calendar', 'days30'])
  monthCounting: 'exact' | 'calendar' | 'days30' = 'calendar';
  @IsOptional() @IsIn(['tach', 'hobbs', 'airframe'])
  meter: 'tach' | 'hobbs' | 'airframe' | null = null;

  @IsOptional() @Matches(ISO_DATE) lastDoneDate: string | null = null;
  @IsOptional() @IsNumber() lastDoneHours: number | null = null;
  @IsOptional() @IsInt() lastDoneCycles: number | null = null;
  // O motor recalcula os vencimentos; os campos existem so para completar o contrato.
  @IsOptional() @Matches(ISO_DATE) nextDueDate: string | null = null;
  @IsOptional() @IsNumber() nextDueHours: number | null = null;
  @IsOptional() @IsInt() nextDueCycles: number | null = null;
  @IsOptional() @IsString() @MaxLength(2000) notes: string | null = null;
}

export class ResetRuleDto {
  @IsString() @MaxLength(60) adjustedKind!: string;
  @IsString() @MaxLength(60) adjustedByKind!: string;
}

export class UrgencyThresholdsDto {
  @IsInt() @Min(0) dueSoonDays!: number;
  @IsNumber() @Min(0) dueSoonHours!: number;
  @IsInt() @Min(0) dueSoonCycles!: number;
}

export class UtilizationSnapshotDto {
  @IsNumber() @Min(0) hoursPerDay!: number;
  @IsInt() @Min(0) sampleCount!: number;
  @IsNumber() @Min(0) spanDays!: number;
  @IsIn(['high', 'medium', 'low', 'none']) confidence!: 'high' | 'medium' | 'low' | 'none';
  @Matches(ISO_DATE) windowStart!: string;
  @Matches(ISO_DATE) windowEnd!: string;
  @IsIn(['tach', 'hobbs']) meter!: 'tach' | 'hobbs';
}

export class ComplianceAssessRequestDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ComplianceItemDto)
  items!: ComplianceItemDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ResetRuleDto)
  resetRules?: ResetRuleDto[];

  @IsOptional() @IsNumber() currentHours?: number | null;
  @IsOptional() @IsInt() currentCycles?: number | null;
  @IsOptional() @ValidateNested() @Type(() => UrgencyThresholdsDto) thresholds?: UrgencyThresholdsDto;
  @IsOptional() @Matches(ISO_DATE) today?: string;
  @IsOptional() @ValidateNested() @Type(() => UtilizationSnapshotDto) utilization?: UtilizationSnapshotDto;
}

export class WBTripleDto {
  @IsOptional() @IsNumber() weight: number | null = null;
  @IsOptional() @IsNumber() arm: number | null = null;
  @IsOptional() @IsNumber() moment: number | null = null;
}

export class EquipChangeDto {
  @IsString() @MaxLength(255) name!: string;
  @Matches(ISO_DATE) date!: string;
  @IsIn(['install', 'removal']) kind!: 'install' | 'removal';
}

export class WBAssessRequestDto {
  @IsObject() @ValidateNested() @Type(() => WBTripleDto) triple!: WBTripleDto;
  @IsOptional() @Matches(ISO_DATE) latestWBDate: string | null = null;
  @IsArray() @ValidateNested({ each: true }) @Type(() => EquipChangeDto) changes!: EquipChangeDto[];
}

export class RawCounterRowDto {
  @IsString() @MaxLength(40) changeDate!: string;
  @IsOptional() @IsNumber() value: number | null = null;
}

export class CounterValueRequestDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RawCounterRowDto) rows!: RawCounterRowDto[];
  @IsString() @MaxLength(60) counterType!: string;
  @Matches(ISO_DATE) analysisDate!: string;
  @IsOptional() @IsInt() @Min(1) lookbackDays?: number;
}

export class CounterEntryDto {
  @Matches(ISO_DATE) date!: string;
  @IsNumber() value!: number;
}

export class CounterUpdateDto {
  @IsOptional() @IsNumber() hobbs?: number;
  @IsOptional() @IsNumber() tach?: number;
  @IsOptional() @IsNumber() airframe?: number;
}

export class CounterValidateRequestDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CounterEntryDto) history!: CounterEntryDto[];
  @Matches(ISO_DATE) maintenanceDate!: string;
  @IsObject() @ValidateNested() @Type(() => CounterUpdateDto) updates!: CounterUpdateDto;
}

export class TimeAmortizationConfigDto {
  @IsIn(['time']) basis!: 'time';
  @IsNumber() @Min(0.01) totalCost!: number;
  @Matches(ISO_DATE) startDate!: string;
  @Matches(ISO_DATE) endDate!: string;
}

export class UsageAmortizationConfigDto {
  @IsIn(['usage']) basis!: 'usage';
  @IsNumber() @Min(0.01) totalCost!: number;
  @IsNumber() startCounterValue!: number;
  @IsNumber() endCounterValue!: number;
}

export type AmortizationConfigDto = TimeAmortizationConfigDto | UsageAmortizationConfigDto;

export class CounterLogDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CounterEntryDto) entries!: CounterEntryDto[];
  @IsString() @MaxLength(60) counterType!: string;
}

export class AmortizationRequestDto {
  @IsObject()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'basis',
      subTypes: [
        { name: 'time', value: TimeAmortizationConfigDto },
        { name: 'usage', value: UsageAmortizationConfigDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  config!: AmortizationConfigDto;
  @Matches(ISO_DATE) analysisStart!: string;
  @Matches(ISO_DATE) analysisEnd!: string;
  @IsOptional() @ValidateNested() @Type(() => CounterLogDto) counterLog?: CounterLogDto;
}

// ---------------------------------------------------------------------------
// Escrita (persistencia)
// ---------------------------------------------------------------------------

export class CreateAircraftDto {
  @Matches(REGISTRATION, { message: 'registration deve ser do tipo PP-XXX.' })
  registration!: string;

  @IsString() @MaxLength(100) model!: string;
  @IsString() @MaxLength(100) manufacturer!: string;
  @IsOptional() @IsString() @MaxLength(100) serialNumber?: string | null;
  @IsOptional() @IsNumber() @Min(0) totalHours?: number;
  @IsOptional() @IsInt() @Min(0) totalCycles?: number;
}

export class RecordMeterReadingDto {
  @Matches(ISO_DATE) readingDate!: string;
  @IsOptional() @IsNumber() @Min(0) tach?: number | null;
  @IsOptional() @IsNumber() @Min(0) hobbs?: number | null;
  @IsOptional() @IsNumber() @Min(0) airframe?: number | null;
  @IsOptional() @IsBoolean() estimated?: boolean;
  @IsOptional() @IsString() @MaxLength(50) source?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class CreateMeterResetDto {
  @IsIn(['tach', 'hobbs']) meter!: 'tach' | 'hobbs';
  @Matches(ISO_DATE) resetDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class CreateComplianceItemDto {
  @IsString() @MaxLength(60) kind!: string;
  @IsString() @MaxLength(255) label!: string;
  @IsOptional() @IsBoolean() regulatory?: boolean;
  @IsOptional() @IsInt() @Min(1) intervalMonths?: number | null;
  @IsOptional() @IsNumber() @Min(0.01) intervalHours?: number | null;
  @IsOptional() @IsInt() @Min(1) intervalCycles?: number | null;
  @IsOptional() @IsIn(['exact', 'calendar', 'days30']) monthCounting?: 'exact' | 'calendar' | 'days30';
  @IsOptional() @IsIn(['tach', 'hobbs', 'airframe']) meter?: 'tach' | 'hobbs' | 'airframe' | null;
  @IsOptional() @Matches(ISO_DATE) lastDoneDate?: string | null;
  @IsOptional() @IsNumber() lastDoneHours?: number | null;
  @IsOptional() @IsInt() lastDoneCycles?: number | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class CreateComplianceResetRuleDto {
  @IsString() @MaxLength(60) adjustedKind!: string;
  @IsString() @MaxLength(60) adjustedByKind!: string;
}

export class RecordComplianceDoneDto {
  @IsString() complianceItemId!: string;
  @Matches(ISO_DATE) doneDate!: string;
  @IsOptional() @IsNumber() doneHours?: number | null;
  @IsOptional() @IsInt() doneCycles?: number | null;
}
