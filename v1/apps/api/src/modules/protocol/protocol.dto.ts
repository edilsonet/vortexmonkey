import { PROTOCOL_ACCESS_LEVELS, PROTOCOL_EVENT_TYPES, RESTRICTION_BASES, type ProtocolAccessLevel, type ProtocolEventType, type RestrictionBasis } from '@vortex/contracts-be';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateProtocolDto {
  @IsUUID() public entityId!: string;
  @IsString() @MaxLength(100) public entityType!: string;
  @IsString() @MinLength(3) @MaxLength(255) public subject!: string;
  @IsIn(PROTOCOL_ACCESS_LEVELS) public accessLevel!: ProtocolAccessLevel;
  @IsOptional() @IsIn(RESTRICTION_BASES) public restrictionBasis?: RestrictionBasis;
  @IsBoolean() public containsPersonalData!: boolean;
}

export class AppendProtocolEventDto {
  @IsIn(PROTOCOL_EVENT_TYPES) public eventType!: ProtocolEventType;
  @IsString() @MinLength(3) @MaxLength(500) public description!: string;
  @IsObject() public payload!: Record<string, unknown>;
  @IsIn(PROTOCOL_ACCESS_LEVELS) public accessLevel!: ProtocolAccessLevel;
  @IsOptional() @IsIn(RESTRICTION_BASES) public restrictionBasis?: RestrictionBasis;
}

export class RequestProtocolViewDto {
  @IsString() @MinLength(10) @MaxLength(1000) public justification!: string;
}

export class DecideProtocolViewDto {
  @IsIn(['GRANTED', 'DENIED']) public decision!: 'GRANTED' | 'DENIED';
  @IsString() @MinLength(3) @MaxLength(1000) public reason!: string;
}

export class PublicSearchDto {
  @IsOptional() @IsString() @MaxLength(255) public q?: string;
}
