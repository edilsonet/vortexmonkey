import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateCenterDto {
  @IsUUID()
  public companyId!: string;

  @IsIn(["CIAC", "CTAC"])
  public centerType!: string;

  @IsOptional()
  @IsIn(["TIPO_1_PILOTOS", "TIPO_2_COMISSARIOS", "TIPO_3_MECANICOS"])
  public ciacType?: string;

  @IsOptional()
  @IsString()
  public certificateNumber?: string;

  @IsOptional()
  @IsString()
  public eiNumber?: string;

  @IsOptional()
  @IsString()
  public etNumber?: string;
}

export class CreateCourseDto {
  @IsUUID()
  public centerId!: string;

  @IsIn(["PP", "PC", "PLA", "IFR", "COMISSARIO", "MMA", "DOV"])
  public courseType!: string;

  @IsString()
  public title!: string;

  @IsInt()
  @Min(1)
  public durationMonths!: number;

  @IsOptional()
  @IsBoolean()
  public sellOnRloja?: boolean;
}

export class EnrollStudentDto {
  @IsUUID()
  public centerId!: string;

  @IsOptional()
  @IsUUID()
  public courseId?: string;

  @IsUUID()
  public personId!: string;

  @IsIn(["PP", "PC", "PLA", "IFR", "COMISSARIO", "MMA", "DOV"])
  public courseType!: string;

  @IsInt()
  @Min(1)
  public durationMonths!: number;

  @IsOptional()
  @IsString()
  public theoryEvaluationDate?: string;
}

export class CreateFstdDto {
  @IsUUID()
  public centerId!: string;

  @IsIn(["FFS", "FTD", "FNPT", "BITD"])
  public deviceType!: string;

  @IsString()
  public qualificationLevel!: string;

  @IsOptional()
  @IsString()
  public qualificationExpiry?: string;
}

export class CreateInstructorDto {
  @IsUUID()
  public centerId!: string;

  @IsUUID()
  public personId!: string;

  @IsIn(["SOLO", "VOO", "SIMULADOR", "EXAMINADOR"])
  public instructorType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public pedagogicalHours?: number;
}

export class SessionDto {
  @IsUUID()
  public fstdId!: string;
}
