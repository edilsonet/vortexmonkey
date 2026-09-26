import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const PRODUCT_CATEGORIES = ['AERONAVE', 'MOTOR', 'HELICE', 'RADIO', 'INSTRUMENTO', 'ACESSORIO', 'PECA', 'CONSUMIVEL'] as const;
const LISTING_ORIGINS = ['EMPRESA', 'PARTICULAR'] as const;

export class CreateListingDto {
  @IsUUID()
  @IsNotEmpty()
  inventory_item_id!: string;

  @IsEnum(LISTING_ORIGINS)
  @IsNotEmpty()
  origin!: string;

  @IsEnum(PRODUCT_CATEGORIES)
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  price!: number;
}

export class ApproveListingDto {
  @IsNotEmpty()
  approved!: boolean;
}

export class SearchListingsDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  q?: string;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  listing_id!: string;

  @IsUUID()
  @IsOptional()
  buyer_company_id?: string;

  @IsUUID()
  @IsOptional()
  buyer_person_id?: string;
}

export class PayOrderDto {
  @IsString()
  @IsNotEmpty()
  payment_reference!: string;
}
