import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() public email!: string;
  @IsString() @MinLength(12) public password!: string;
}

export class RefreshTokenDto {
  @IsString() @MinLength(32) public refreshToken!: string;
}

export class LogoutDto {
  @IsString() @MinLength(32) public refreshToken!: string;
}
