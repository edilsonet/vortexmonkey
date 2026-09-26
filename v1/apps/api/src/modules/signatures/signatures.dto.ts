import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { SignatureLevel, ProviderCode } from '@vortex/contracts-be';

export class CreateSignatureRequestDto {
  @IsUUID()
  documentId!: string;

  @IsEnum(['SIMPLE', 'AVANCADA', 'QUALIFICADA'])
  requiredLevel!: SignatureLevel;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  message?: string;

  @IsOptional()
  expiresAt?: string;
}

export class SignDocumentDto {
  @IsEnum(['SIMPLE', 'GOVBR', 'ICP_SERPRO', 'ICP_CERTISIGN'])
  providerCode!: ProviderCode;

  /**
   * Credencial do signatário:
   * - SIMPLE: senha do usuário
   * - GOVBR: código TOTP 6 dígitos
   * - ICP_SERPRO / ICP_CERTISIGN: certificado PEM
   * Nunca persiste este campo — apenas usado durante o fluxo de assinatura.
   */
  @IsString()
  @MaxLength(8192)
  credential!: string;
}
