import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { RequestContext } from '@vortex/types';
import type { Request } from 'express';
import { IS_PUBLIC } from './security.decorators';

interface Membership { tenantId: string; roles: string[]; companyIds: string[]; scopes: string[] }
interface Claims { sub: string; memberships: Membership[] }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Token Bearer obrigatório.' });
    try {
      const claims = await this.jwt.verifyAsync<Claims>(token, { issuer: process.env.JWT_ISSUER ?? 'vortex.local', audience: process.env.JWT_AUDIENCE ?? 'vortex-api' });
      const tenantId = request.header('x-tenant-id') ?? claims.memberships[0]?.tenantId;
      const membership = claims.memberships.find((item) => item.tenantId === tenantId);
      if (!tenantId || !membership) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Contexto de tenant não autorizado.' });
      const requestedCompanyId = request.header('x-company-id');
      if (requestedCompanyId && !membership.companyIds.includes(requestedCompanyId)) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Contexto de empresa não autorizado.' });
      const vortexContext: RequestContext = { requestId: request.requestId, userId: claims.sub, tenantId, roles: membership.roles, scopes: membership.scopes ?? [] };
      const companyId = requestedCompanyId ?? membership.companyIds[0];
      if (companyId) vortexContext.companyId = companyId;
      request.vortexContext = vortexContext;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) throw error;
      if (error instanceof TokenExpiredError) throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Token expirado.' });
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Token inválido.' });
    }
  }
}
