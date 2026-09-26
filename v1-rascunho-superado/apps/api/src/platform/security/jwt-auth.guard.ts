import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC } from "./public.decorator.ts";
import type { RequestContext, Role } from "@vortex/types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: RequestContext }>();
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Token ausente." });
    }
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        personId: string;
        tenantId: string | null;
        companyId: string | null;
        roles: Role[];
        scopes: string[];
      }>(header.slice(7));
      req.user = {
        userId: payload.sub,
        personId: payload.personId,
        tenantId: payload.tenantId,
        companyId: payload.companyId,
        roles: payload.roles ?? [],
        scopes: payload.scopes ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException({ code: "TOKEN_EXPIRED", message: "Token invalido ou expirado." });
    }
  }
}
