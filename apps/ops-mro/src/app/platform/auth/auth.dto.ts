import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Corpo do `POST /api/auth/login`. */
export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  public email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  public password!: string;

  @IsOptional()
  @IsUUID()
  public tenantId?: string;

  @IsOptional()
  @IsUUID()
  public companyId?: string;
}

/** Corpo de `POST /api/auth/refresh` e `POST /api/auth/logout`. */
export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  public refreshToken!: string;
}

/** Corpo de `POST /api/auth/password` (troca de senha do proprio usuario). */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  public currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  public newPassword!: string;
}
