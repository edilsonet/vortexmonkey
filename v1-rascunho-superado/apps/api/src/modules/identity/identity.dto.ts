import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  public cnpj!: string;

  @IsString()
  public corporateName!: string;

  @IsOptional()
  @IsString()
  public tradeName?: string;
}

export class CreateRelationshipDto {
  @IsUUID()
  public personId!: string;

  @IsUUID()
  public companyId!: string;

  @IsIn(["CRIADOR_EMPRESA", "ADMIN", "REPRESENTANTE_LEGAL", "PROCURADOR", "PROPRIETARIO_OPERADOR", "FUNCIONARIO"])
  public role!: string;
}

export class ConfirmRelationshipDto {
  @IsIn(["PERSON", "COMPANY"])
  public side!: "PERSON" | "COMPANY";
}

export class SetValidationDto {
  @IsString()
  public fieldName!: string;

  @IsIn(["N0", "N1", "N2", "N3"])
  public level!: "N0" | "N1" | "N2" | "N3";

  @IsOptional()
  @IsString()
  public source?: string;
}
