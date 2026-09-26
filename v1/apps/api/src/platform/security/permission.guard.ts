import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { IS_PUBLIC, REQUIRED_ROLES, REQUIRED_SCOPES } from './security.decorators';

@Injectable()
export class PermissionGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector, private readonly database: DatabaseService) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const vortex = request.vortexContext;
    if (!vortex) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Contexto de autorização ausente.' });
    const requiredRoles = this.reflector.getAllAndOverride<readonly string[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]) ?? [];
    const requiredScopes = this.reflector.getAllAndOverride<readonly string[]>(REQUIRED_SCOPES, [context.getHandler(), context.getClass()]) ?? [];
    if (requiredRoles.length && !requiredRoles.some((role) => vortex.roles.includes(role))) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Papel insuficiente.' });
    if (requiredScopes.length && !requiredScopes.every((scope) => vortex.scopes.includes(scope))) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Escopo insuficiente.' });
    const active = await this.database.withContext(vortex, async (client) => client.query('SELECT 1 FROM identity.tenant_users WHERE tenant_id = $1 AND user_id = $2 AND status = $3', [vortex.tenantId, vortex.userId, 'ACTIVE']));
    if (!active.rowCount) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Usuário sem vínculo ativo com o tenant.' });
    return true;
  }
}
