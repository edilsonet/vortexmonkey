import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, REGULATORY_DOCUMENT_TYPES, type DocumentClassification, type RegulatoryDocumentType } from '@vortex/contracts-be';

export class InitiateUploadDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(ALLOWED_MIME_TYPES)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES)
  sizeBytes!: number;

  /** SHA-256 do conteúdo calculado pelo cliente antes do upload. */
  @IsString()
  @MaxLength(64)
  hash!: string;

  @IsEnum(['PUBLIC', 'RESTRICTED', 'PRIVATE'])
  classification!: DocumentClassification;

  @IsBoolean()
  containsPersonalData!: boolean;

  @IsIn([...REGULATORY_DOCUMENT_TYPES])
  @IsOptional()
  documentType?: RegulatoryDocumentType;

  @IsUUID()
  @IsOptional()
  protocolId?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  ownerType?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;
}

export class ConfirmUploadDto {
  /** SHA-256 recalculado pelo servidor após o upload (verificação de integridade). */
  @IsString()
  @MaxLength(64)
  confirmedHash!: string;
}

export class AddVersionDto {
  @IsString()
  @MaxLength(64)
  hash!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES)
  sizeBytes!: number;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  changeNote?: string;
}

export class GenerateSegvoo001Dto {
  @IsString()
  @MaxLength(255)
  aeronaveRegistro!: string;

  @IsString()
  @MaxLength(255)
  pilotoEmComando!: string;

  @IsString()
  @MaxLength(500)
  relato!: string;

  @IsString()
  @MaxLength(255)
  origem!: string;

  @IsString()
  @MaxLength(255)
  destino!: string;

  @IsString()
  dataHoraVoo!: string;
}
