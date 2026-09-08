import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateAerodromeDto {
  @IsUUID()
  public companyId!: string;

  @IsString()
  public icaoCode!: string;

  @IsString()
  public name!: string;

  @IsOptional()
  @IsIn(["CAT_1", "CAT_2", "CAT_3", "CAT_4", "CAT_5", "CAT_6", "CAT_7", "CAT_8", "CAT_9", "CAT_10"])
  public fireCategory?: string;
}

export class CreatePavementDto {
  @IsUUID()
  public aerodromeId!: string;

  @IsString()
  public runwayDesignator!: string;

  @IsOptional()
  @IsString()
  public pcn?: string;

  @IsNumber()
  public iri!: number;

  @IsNumber()
  public macrotexture!: number;
}

export class CreateRcrDto {
  @IsUUID()
  public aerodromeId!: string;

  @IsString()
  public runwayDesignator!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  public rwyccT1!: number;

  @IsInt()
  @Min(0)
  @Max(6)
  public rwyccT2!: number;

  @IsInt()
  @Min(0)
  @Max(6)
  public rwyccT3!: number;

  @IsOptional()
  @IsString()
  public contaminant?: string;
}

export class CreateFireDto {
  @IsUUID()
  public aerodromeId!: string;

  @IsString()
  public incidentType!: string;

  @IsInt()
  @Min(0)
  public responseTimeSeconds!: number;
}

export class CreateFaunaDto {
  @IsUUID()
  public aerodromeId!: string;

  @IsIn(["AVISTAMENTO", "COLISAO"])
  public eventType!: string;

  @IsOptional()
  @IsString()
  public species?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  public count?: number;
}

export class CreateMaintDto {
  @IsUUID()
  public aerodromeId!: string;

  @IsIn(["PISTA", "TAXIWAY", "PATIO", "SINALIZACAO", "ILUMINACAO", "ELETRICA", "EQUIPAMENTOS", "VEICULOS"])
  public area!: string;

  @IsOptional()
  @IsString()
  public notes?: string;
}
