import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";
import { SELLABLE_CODES } from "./billing.policy.ts";

export class SubscribeDto {
  @IsIn([...SELLABLE_CODES])
  public productCode!: (typeof SELLABLE_CODES)[number];

  @IsOptional()
  @IsUUID()
  public companyId?: string;
}

export class RecordCommissionDto {
  @IsIn(["RLOJA_SALE", "RECRUITMENT_HIRE"])
  public source!: "RLOJA_SALE" | "RECRUITMENT_HIRE";

  @IsUUID()
  public sourceId!: string;

  @IsNumber()
  @IsPositive()
  public grossBrl!: number;

  @IsOptional()
  @IsUUID()
  public companyId?: string;

  @IsOptional()
  @IsString()
  public notes?: string;
}
