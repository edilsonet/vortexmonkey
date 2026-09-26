import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsUUID() public userId?: string;
  @IsOptional() @IsUUID() public entityId?: string;
  @IsOptional() @IsDateString() public from?: string;
  @IsOptional() @IsDateString() public to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) public limit?: number;
}
