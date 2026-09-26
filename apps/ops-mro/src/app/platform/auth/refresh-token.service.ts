import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

/** Refresh token recem-gerado: o valor opaco so existe aqui e na resposta HTTP. */
export interface IssuedRefreshToken {
  /** Id da linha em `identity.refresh_tokens`. */
  readonly id: string;
  /** Familia da sessao; a rotacao mantem a mesma familia. */
  readonly familyId: string;
  /** Segredo opaco entregue ao cliente (nunca persistido em claro). */
  readonly token: string;
  /** SHA-256 em hexadecimal do `token`; e isto que vai ao banco. */
  readonly hash: string;
  readonly expiresIn: number;
}

/**
 * Gera e identifica refresh tokens.
 *
 * O token e aleatorio (32 bytes, base64url) e o banco guarda apenas o SHA-256.
 * Hash simples basta aqui — o valor tem entropia alta, entao nao ha ataque de
 * dicionario a temer, e a comparacao por igualdade usa o indice unico.
 */
@Injectable()
export class RefreshTokenService {
  public readonly ttlSeconds = Number(process.env.REFRESH_TTL_SECONDS ?? 2_592_000);

  public issue(familyId: string = randomUUID()): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    return { id: randomUUID(), familyId, token, hash: this.hash(token), expiresIn: this.ttlSeconds };
  }

  public hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
