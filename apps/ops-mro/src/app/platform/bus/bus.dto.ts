import { IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Corpo do re-drive: ids especificos (opcional) ou limite do lote. */
export class OutboxRedriveDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  limit?: number;
}
