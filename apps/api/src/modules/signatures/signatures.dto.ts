import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSignatureRequestDto {
  @IsUUID()
  public documentId!: string;

  @IsIn(["SIMPLE", "AVANCADA", "QUALIFICADA"])
  public requiredLevel!: "SIMPLE" | "AVANCADA" | "QUALIFICADA";

  @IsOptional()
  @IsString()
  public signers?: string;
}

export class SignDocumentDto {
  @IsUUID()
  public documentId!: string;

  @IsIn(["SIMPLE", "GOVBR", "ICP_SERPRO", "ICP_CERTISIGN"])
  public providerCode!: "SIMPLE" | "GOVBR" | "ICP_SERPRO" | "ICP_CERTISIGN";

  @IsString()
  public credential!: string;
}
