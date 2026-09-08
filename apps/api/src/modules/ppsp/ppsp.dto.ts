import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateProgramDto {
  @IsUUID()
  public companyId!: string;

  @IsInt()
  @Min(2020)
  @Max(2100)
  public year!: number;

  @IsUUID()
  public arsoPersonId!: string;
}

export class AddMemberDto {
  @IsUUID()
  public personId!: string;

  @IsOptional()
  @IsBoolean()
  public safetySensitive?: boolean;
}

export class RecordExamDto {
  @IsUUID()
  public companyId!: string;

  @IsUUID()
  public personId!: string;

  @IsDateString()
  public collectedAt!: string;

  @IsIn(["NEGATIVE", "POSITIVE", "PENDING"])
  public result!: "NEGATIVE" | "POSITIVE" | "PENDING";
}

export class DrawDto {
  @IsOptional()
  @IsString()
  public seed?: string;
}
