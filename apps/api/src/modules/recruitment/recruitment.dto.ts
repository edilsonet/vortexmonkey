import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class CreateVacancyDto {
  @IsUUID()
  public companyId!: string;

  @IsString()
  public title!: string;

  @IsOptional()
  @IsString()
  public sourceApp?: string;
}

export class ApplyDto {
  @IsUUID()
  public vacancyId!: string;
}

export class HireDto {
  @IsUUID()
  public applicationId!: string;

  @IsNumber()
  @IsPositive()
  public salaryBrl!: number;
}
