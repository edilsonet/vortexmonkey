import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class InitiateUploadDto {
  @IsString()
  public name!: string;

  @IsString()
  public mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public sizeBytes!: number;

  @IsString()
  public hash!: string;

  @IsIn(["PUBLIC", "RESTRICTED", "PRIVATE"])
  public classification!: "PUBLIC" | "RESTRICTED" | "PRIVATE";

  @IsBoolean()
  public containsPersonalData!: boolean;

  @IsOptional()
  @IsString()
  public documentType?: string;

  @IsOptional()
  @IsString()
  public content?: string;
}

export class AddVersionDto {
  @IsString()
  public hash!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public sizeBytes!: number;

  @IsOptional()
  @IsString()
  public changeNote?: string;

  @IsOptional()
  @IsString()
  public content?: string;
}
