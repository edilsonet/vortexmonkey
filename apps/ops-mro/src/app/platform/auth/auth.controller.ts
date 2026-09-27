import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  ChangePasswordResponse,
  ListSessionsResponse,
  LoginResponse,
  RequestContext,
  RevokeSessionResponse,
  RevokeSessionsResponse,
} from '@vortex/shared-dto';
import { Throttle } from '@nestjs/throttler';
import { ContextGuard } from '../http/context.guard';
import { IdempotentRoute, WriteRoute } from '../http/write-route.decorator';
import { VortexContext } from '../http/request-context.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshTokenDto } from './auth.dto';

/**
 * Rotas de autenticacao.
 *
 * `POST /login`, `POST /refresh` e `POST /logout` escrevem sem contexto (o
 * token pode estar vencido) e por isso exigem `Idempotency-Key` (regra 6), mas
 * NAO passam pelo `ContextGuard`. `GET /me` devolve o contexto resolvido para o
 * cliente conferir tenant/empresa antes de operar.
 *
 * `POST /password` e `POST /sessions/revoke` exigem contexto (so o proprio
 * usuario age sobre as proprias sessoes) e por isso usam `WriteRoute`.
 *
 * `login`/`refresh`/`logout` apertam o rate limit global (10/min por IP): sao as
 * rotas que interessam a forca bruta de credenciais. A politica de bloqueio por
 * tentativas invalidas continua no banco (`identity.verify_password`).
 */
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  public constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @IdempotentRoute()
  @Throttle(AUTH_LIMIT)
  public login(
    @Body() body: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<LoginResponse> {
    return this.auth.login(body, {
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @IdempotentRoute()
  @Throttle(AUTH_LIMIT)
  public refresh(
    @Body() body: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ): Promise<LoginResponse> {
    return this.auth.refresh(body, {
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });
  }

  @Post('logout')
  @HttpCode(200)
  @IdempotentRoute()
  @Throttle(AUTH_LIMIT)
  public logout(@Body() body: RefreshTokenDto): Promise<{ revoked: number }> {
    return this.auth.logout(body);
  }

  @Get('me')
  @UseGuards(ContextGuard)
  public me(@VortexContext() context: RequestContext): RequestContext {
    return context;
  }

  @Post('password')
  @HttpCode(200)
  @WriteRoute()
  public changePassword(
    @VortexContext() context: RequestContext,
    @Body() body: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    return this.auth.changePassword(context.userId, body);
  }

  @Post('sessions/revoke')
  @HttpCode(200)
  @WriteRoute()
  public revokeSessions(@VortexContext() context: RequestContext): Promise<RevokeSessionsResponse> {
    return this.auth.revokeAllSessions(context.userId);
  }

  @Get('sessions')
  @UseGuards(ContextGuard)
  public listSessions(@VortexContext() context: RequestContext): Promise<ListSessionsResponse> {
    return this.auth.listSessions(context.userId);
  }

  @Post('sessions/:sessionId/revoke')
  @HttpCode(200)
  @WriteRoute()
  public revokeSession(
    @VortexContext() context: RequestContext,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<RevokeSessionResponse> {
    return this.auth.revokeSession(context.userId, sessionId);
  }
}
