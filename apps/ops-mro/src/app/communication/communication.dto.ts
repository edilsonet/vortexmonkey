import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTOs de transporte da Central de Comunicacao. O `ValidationPipe` global
 * rejeita corpo malformado com VALIDATION_ERROR (422). Os contratos canonicos
 * (formas consumidas pelo Angular) ficam em `@vortex/shared-dto`.
 */

const TOPICS = ['COMPANY', 'RECRUITMENT', 'DIRECT', 'TENANT'] as const;
const SCOPES = ['PLATFORM', 'TENANT', 'COMPANY'] as const;
const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL', 'BLOCKING'] as const;

export class CreateConversationDto {
  @IsIn(TOPICS) topic!: (typeof TOPICS)[number];
  @IsString() @MinLength(1) @MaxLength(255) title!: string;

  @IsOptional() @IsUUID() companyId?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantUserIds?: string[];
}

export class PostMessageDto {
  @IsString() @MinLength(1) @MaxLength(8000) body!: string;
}

export class PublishAnnouncementDto {
  @IsIn(SCOPES) scope!: (typeof SCOPES)[number];

  @IsOptional() @IsUUID() companyId?: string | null;
  @IsOptional() @IsIn(SEVERITIES) severity?: (typeof SEVERITIES)[number];

  @IsString() @MinLength(1) @MaxLength(255) title!: string;
  @IsString() @MinLength(1) @MaxLength(20000) body!: string;

  @IsOptional() @IsString() @MaxLength(40) expiresAt?: string | null;
}

export class QueueMailDto {
  @IsEmail() @MaxLength(320) toAddress!: string;
  @IsString() @MinLength(1) @MaxLength(255) subject!: string;
  @IsString() @MinLength(1) @MaxLength(20000) body!: string;

  @IsOptional() @IsString() @MaxLength(100) relatedEntityType?: string | null;
  @IsOptional() @IsUUID() relatedEntityId?: string | null;
}
