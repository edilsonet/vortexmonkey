import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateListingDto {
  @IsUUID()
  public inventoryItemId!: string;

  @IsIn(["EMPRESA", "PARTICULAR"])
  public origin!: string;

  @IsIn(["AERONAVE", "MOTOR", "HELICE", "RADIO", "INSTRUMENTO", "ACESSORIO", "PECA", "CONSUMIVEL"])
  public category!: string;

  @IsString()
  public title!: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsNumber()
  @Min(0)
  public price!: number;

  @IsOptional()
  @IsUUID()
  public sellerCompanyId?: string;
}

export class CreateOrderDto {
  @IsUUID()
  public listingId!: string;

  @IsOptional()
  @IsUUID()
  public buyerCompanyId?: string;
}
