import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../platform/security/security.decorators';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenDto } from './auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  public constructor(private readonly auth: AuthService) {}
  @Post('login') @Public() public login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('refresh') @Public() public refresh(@Body() dto: RefreshTokenDto) { return this.auth.refresh(dto.refreshToken); }
  @Post('logout') @Public() public logout(@Body() dto: LogoutDto) { return this.auth.logout(dto.refreshToken); }
}
