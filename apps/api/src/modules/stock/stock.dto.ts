import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class AddItemDto {
  @IsUUID()
  public holdingId!: string;

  @IsString()
  public sku!: string;

  @IsString()
  public name!: string;

  @IsOptional()
  @IsNumber()
  public quantity?: number;

  @IsIn(["PERSONAL", "COMPANY", "ERP_MRO", "ERP_OPS", "ERP_TRAINING", "ERP_AIRPORT"])
  public originMark!: string;
}

export class TransferCustodyDto {
  @IsUUID()
  public itemId!: string;

  @IsUUID()
  public targetHoldingId!: string;
}
