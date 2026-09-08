import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @MinLength(8)
  public password!: string;
}

export class RegisterDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @MinLength(8)
  public password!: string;

  @IsString()
  public fullName!: string;

  @IsString()
  public cpf!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  public currentPassword!: string;

  @IsString()
  @MinLength(8)
  public newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  public email!: string;
}

export class ResetPasswordDto {
  @IsString()
  public token!: string;

  @IsString()
  @MinLength(8)
  public newPassword!: string;
}
