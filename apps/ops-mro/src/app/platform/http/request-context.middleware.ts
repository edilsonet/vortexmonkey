import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { isTokenExpired, JwtService } from '../auth/jwt.service';

/**
 * Monta o `RequestContext` e o `x-request-id`.
 *
 * Fonte primaria: `Authorization: Bearer <jwt>` emitido por `POST /api/auth/login`.
 * O contexto provisorio por cabecalho (`x-user-id`/`x-tenant-id`/`x-company-id`)
 * continua disponivel apenas quando `AUTH_ALLOW_HEADER_CONTEXT` permite — por
 * padrao em desenvolvimento/teste, nunca em producao.
 *
 * O RLS continua sendo a barreira real: mesmo com contexto valido, sem vinculo
 * ativo em `identity.tenant_users` / `identity.relationships` nenhuma linha e
 * visivel e nenhuma escrita e aceita.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly allowHeaderContext =
    (process.env.AUTH_ALLOW_HEADER_CONTEXT ?? String(process.env.NODE_ENV !== 'production')) === 'true';

  public constructor(private readonly jwt: JwtService) {}

  public use(request: Request, response: Response, next: NextFunction): void {
    const requestId = request.header('x-request-id') ?? randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const authorization = request.header('authorization');
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (bearer) {
      try {
        const claims = this.jwt.verify(bearer);
        request.vortexContext = {
          userId: claims.sub,
          tenantId: claims.tid,
          companyId: claims.cid,
          requestId,
        };
      } catch (error) {
        request.vortexAuthError = isTokenExpired(error)
          ? { code: 'TOKEN_EXPIRED', message: 'Token expirado. Autentique-se novamente.' }
          : { code: 'AUTH_REQUIRED', message: 'Token invalido.' };
      }
      next();
      return;
    }

    if (!this.allowHeaderContext) {
      next();
      return;
    }

    const userId = request.header('x-user-id');
    const tenantId = request.header('x-tenant-id');
    if (userId && tenantId) {
      request.vortexContext = {
        userId,
        tenantId,
        companyId: request.header('x-company-id') ?? null,
        requestId,
      };
    }
    next();
  }
}
