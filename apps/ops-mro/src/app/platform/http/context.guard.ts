import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Exige `RequestContext` nas rotas que tocam o banco. Sem contexto o RLS nao
 * teria o que aplicar e a consulta devolveria vazio por acidente; melhor negar
 * de forma explicita com AUTH_REQUIRED (401).
 */
@Injectable()
export class ContextGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.vortexContext === undefined) {
      throw new UnauthorizedException(
        request.vortexAuthError ?? {
          code: 'AUTH_REQUIRED',
          message: 'Autenticacao obrigatoria (Authorization: Bearer <token>).',
        },
      );
    }
    return true;
  }
}
