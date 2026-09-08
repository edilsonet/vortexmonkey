import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { WORK_TYPES } from "./mro.policy.ts";

export class CreateOmDto {
  @IsUUID()
  public companyId!: string;

  @IsString()
  public comNumber!: string;

  @IsOptional()
  @IsString()
  public eoNumber?: string;
}

export class CreateAircraftDto {
  @IsString()
  public registration!: string;

  @IsString()
  public model!: string;

  @IsString()
  public manufacturer!: string;
}

export class CreateWorkOrderDto {
  @IsUUID()
  public aircraftId!: string;

  @IsIn([...WORK_TYPES])
  public workType!: (typeof WORK_TYPES)[number];

  @IsOptional()
  @IsString()
  public technicalDataRef?: string;
}

export class AdvanceWorkOrderDto {
  @IsInt()
  @Min(1)
  @Max(12)
  public toStep!: number;
}

export class CreatePartDto {
  @IsString()
  public partNumber!: string;

  @IsOptional()
  @IsString()
  public serialNumber?: string;

  @IsIn(["NOVA", "USADA_SERVICAVEL", "USADA_NAO_SERVICAVEL", "REVISADA", "REPARADA"])
  public condition!: string;

  @IsIn(["TC", "STC", "TSO", "PMA", "OTP", "PADRAO"])
  public certificationType!: string;

  @IsOptional()
  @IsString()
  public form81303?: string;
}

export class CreateToolDto {
  @IsString()
  public identification!: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsIn(["RBC_INMETRO", "FABRICANTE_OEM", "PADRAO_RASTREAVEL_INTERNACIONAL"])
  public calibrationStandard?: string;

  @IsOptional()
  @IsString()
  public calibrationExpiry?: string;
}

export class CreateAdDto {
  @IsUUID()
  public aircraftId!: string;

  @IsString()
  public adNumber!: string;

  @IsOptional()
  @IsString()
  public description?: string;
}

export class ComplyAdDto {
  @IsOptional()
  @IsString()
  public notes?: string;
}

export class CreateManualDto {
  @IsString()
  public title!: string;

  @IsIn(["AMM", "SRM", "CMM", "IPC", "SB"])
  public kind!: string;

  @IsOptional()
  @IsString()
  public revision?: string;
}
