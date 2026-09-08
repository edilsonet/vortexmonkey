import { Body, Controller, Inject, Post } from "@nestjs/common";
import { Public } from "../../platform/security/public.decorator.ts";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { AuthService } from "./auth.service.ts";
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./auth.dto.ts";

@Controller("auth")
export class AuthController {
  public constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  public login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post("register")
  public register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("password")
  public changePassword(@CurrentUser() user: RequestContext, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }

  @Public()
  @Post("forgot")
  public forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgot(dto);
  }

  @Public()
  @Post("reset")
  public reset(@Body() dto: ResetPasswordDto) {
    return this.auth.reset(dto);
  }
}
