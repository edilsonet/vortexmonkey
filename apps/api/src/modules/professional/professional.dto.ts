import { IsDateString, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class UpsertProfileDto {
  @IsIn(["PILOTO", "COMISSARIO", "MECANICO_VOO", "MMA", "DOV", "INSTRUTOR", "EXAMINADOR", "OUTRO"])
  public professionalType!: string;

  @IsOptional()
  @IsString()
  public summary?: string;
}

export class CreateCivDto {
  @IsString()
  public civNumber!: string;

  @IsNumber()
  public hoursTotal!: number;

  @IsOptional()
  @IsDateString()
  public issuedAt?: string;
}

export class CreateCmaDto {
  @IsString()
  public cmaClass!: string;

  @IsDateString()
  public validUntil!: string;

  @IsOptional()
  @IsString()
  public clinicName?: string;
}

export class CreateExperienceDto {
  @IsString()
  public companyName!: string;

  @IsString()
  public roleTitle!: string;

  @IsDateString()
  public startedAt!: string;

  @IsOptional()
  @IsDateString()
  public endedAt?: string;

  @IsOptional()
  @IsString()
  public description?: string;
}
