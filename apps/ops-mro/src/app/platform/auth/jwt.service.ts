import { Injectable } from '@nestjs/common';
import jwt, { TokenExpiredError, type JwtPayload } from 'jsonwebtoken';
import type { AccessTokenClaims } from '@vortex/shared-dto';

/**
 * Emissao e verificacao do access token (HS256).
 *
 * Segredo vem de `JWT_SECRET`; em producao e obrigatorio. `iss`/`aud` sao
 * fixos e verificados: um token de outro sistema com o mesmo segredo nao vale.
 * A expiracao e tratada separadamente (`TokenExpiredError`) para responder
 * `TOKEN_EXPIRED` em vez de `AUTH_REQUIRED`.
 */
@Injectable()
export class JwtService {
  public readonly ttlSeconds = Number(process.env.JWT_TTL_SECONDS ?? 3600);

  private readonly issuer = process.env.JWT_ISSUER ?? 'vortex';
  private readonly audience = process.env.JWT_AUDIENCE ?? 'vortex-api';
  private readonly secret: string;

  public constructor() {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      this.secret = secret;
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET e obrigatorio em producao.');
    } else {
      this.secret = 'dev-jwt-secret-nao-use-em-producao';
    }
  }

  public sign(claims: AccessTokenClaims): { token: string; expiresIn: number } {
    const token = jwt.sign({ tid: claims.tid, cid: claims.cid, role: claims.role }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.ttlSeconds,
      issuer: this.issuer,
      audience: this.audience,
      subject: claims.sub,
    });
    return { token, expiresIn: this.ttlSeconds };
  }

  /** Verifica assinatura, `iss`, `aud` e `exp`; lanca em qualquer falha. */
  public verify(token: string): AccessTokenClaims {
    const payload = jwt.verify(token, this.secret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    });
    if (typeof payload === 'string') throw new Error('Token invalido.');
    const claims = payload as JwtPayload & { tid?: unknown; cid?: unknown; role?: unknown };
    if (typeof claims.sub !== 'string' || typeof claims.tid !== 'string') {
      throw new Error('Token sem os claims obrigatorios (sub, tid).');
    }
    return {
      sub: claims.sub,
      tid: claims.tid,
      cid: typeof claims.cid === 'string' ? claims.cid : null,
      role: typeof claims.role === 'string' ? claims.role : null,
      iat: claims.iat,
      exp: claims.exp,
      iss: claims.iss,
      aud: typeof claims.aud === 'string' ? claims.aud : undefined,
    };
  }
}

/** `true` quando a falha de verificacao foi expiracao (e nao assinatura/formato). */
export function isTokenExpired(error: unknown): boolean {
  return error instanceof TokenExpiredError;
}
