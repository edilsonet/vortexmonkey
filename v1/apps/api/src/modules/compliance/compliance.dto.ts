import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestExportDto {
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  justification?: string;
}

export class RequestErasureDto {
  @IsString()
  @MaxLength(1000)
  justification!: string;
}

export class RevokeConsentDto {
  @IsString()
  @MaxLength(255)
  purpose!: string;

  @IsString()
  @MaxLength(100)
  legalBasis!: string;
}
