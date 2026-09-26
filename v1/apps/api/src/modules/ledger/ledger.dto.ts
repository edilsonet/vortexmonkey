import { IsArray, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AppendLedgerDto {
  @IsString() @MaxLength(100) public entityType!: string;
  @IsUUID() public entityId!: string;
  @IsString() @MaxLength(50) public actionType!: string;
  @IsObject() public payload!: Record<string, unknown>;
  @IsOptional() @IsArray() public changes?: unknown[];
}
