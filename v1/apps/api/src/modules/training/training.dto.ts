import {
  IsDateString,
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
  CiacType,
  CourseType,
  FstdDeviceType,
  FstdQualificationLevel,
  InstructorType,
  StudentRecordType,
  TrainingCenterType,
  TrainingDocumentType,
} from '@vortex/contracts-be';

export class CreateTrainingCenterDto {
  @IsUUID()
  companyId!: string;

  @IsEnum(['CIAC', 'CTAC'])
  centerType!: TrainingCenterType;

  @IsOptional()
  @IsEnum(['TIPO_1_PILOTOS', 'TIPO_2_COMISSARIOS', 'TIPO_3_MECANICOS'])
  ciacType?: CiacType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateNumber?: string;

  @IsOptional()
  @IsDateString()
  certificateValidity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eiNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  etNumber?: string;

  @IsOptional()
  @IsEnum(['ATIVO', 'SUSPENSO', 'REVOGADO'])
  s141Status?: 'ATIVO' | 'SUSPENSO' | 'REVOGADO';
}

export class CreateTrainingDocumentDto {
  @IsUUID()
  centerId!: string;

  @IsEnum(['MIP', 'MGQ', 'MGSO', 'PRE', 'MANUAL_ALUNO', 'MANUAL_INSTRUTOR'])
  documentType!: TrainingDocumentType;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currentVersion?: string;
}

export class EnrollStudentDto {
  @IsUUID()
  centerId!: string;

  @IsUUID()
  personId!: string;

  @IsString()
  @MaxLength(100)
  enrollmentCode!: string;

  @IsEnum(['PP', 'PC', 'PLA', 'IFR', 'COMISSARIO', 'MMA', 'DOV'])
  courseType!: CourseType;

  @IsDateString()
  enrollmentDate!: string;

  @IsInt()
  @Min(1)
  courseDurationMonths!: number;

  @IsOptional()
  @IsDateString()
  theoryEvaluationDate?: string;
}

export class TransferStudentDto {
  @IsString()
  @MaxLength(100)
  externalCenterCode!: string;

  @IsString()
  @MaxLength(255)
  reason!: string;
}

export class GraduateStudentDto {
  @IsDateString()
  completionDate!: string;
}

export class CreateStudentRecordDto {
  @IsUUID()
  studentId!: string;

  @IsEnum(['FREQUENCIA', 'NOTA', 'FICHA_VOO', 'AVALIACAO'])
  recordType!: StudentRecordType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flightHours?: number;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsUUID()
  fstdDeviceId?: string;

  @IsDateString()
  date!: string;
}

export class RegisterFstdDeviceDto {
  @IsUUID()
  centerId!: string;

  @IsEnum(['FFS', 'FTD', 'FNPT', 'BITD'])
  deviceType!: FstdDeviceType;

  @IsEnum(['LEVEL_A', 'LEVEL_B', 'LEVEL_C', 'LEVEL_D', 'BITD', 'FNPT_I', 'FNPT_II', 'FTD_4', 'FTD_5', 'FTD_6'])
  qualificationLevel!: FstdQualificationLevel;

  @IsOptional()
  @IsDateString()
  qualificationExpiry?: string;
}

export class RegisterInstructorDto {
  @IsUUID()
  centerId!: string;

  @IsUUID()
  personId!: string;

  @IsEnum(['SOLO', 'VOO', 'SIMULADOR', 'EXAMINADOR'])
  instructorType!: InstructorType;

  @IsOptional()
  @IsInt()
  @Min(0)
  pedagogicalHours?: number;

  @IsOptional()
  @IsDateString()
  recertificationDate?: string;
}