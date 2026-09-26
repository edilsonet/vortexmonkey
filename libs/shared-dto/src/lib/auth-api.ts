/**
 *
 * O acesso sai do contexto provisorio por cabecalho (`x-user-id`/...) para um
 * token JWT assinado (HS256). O token carrega o vinculo ATIVO escolhido no
 * login: `tid` (tenant) e `cid` (empresa) alimentam o RLS pela mesma
 * `RequestContext` de sempre.
 */

import type { RequestContext } from './context';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  /** Vinculo desejado quando o usuario pertence a mais de um tenant/empresa. */
  readonly tenantId?: string;
  readonly companyId?: string;
}

export interface LoginResponse {
  readonly token: string;
  readonly tokenType: 'Bearer';
  /** Validade do token em segundos. */
  readonly expiresIn: number;
  /**
   * Refresh token opaco da familia aberta neste login. E devolvido UMA vez e o
   * servidor guarda apenas o hash; a cada `/auth/refresh` ele e rotacionado.
   */
  readonly refreshToken: string;
  /** Validade do refresh token em segundos. */
  readonly refreshExpiresIn: number;
  /**
   * Identificador da familia de refresh tokens (a "sessao"). Estavel entre
   * renovacoes; permite ao cliente marcar qual sessao e a atual na listagem.
   */
  readonly sessionId: string;
  /** Contexto resolvido (mesma forma injetada nas rotas de dominio). */
  readonly context: RequestContext;
}

/** Corpo de `POST /api/auth/refresh` e `POST /api/auth/logout`. */
export interface RefreshRequest {
  readonly refreshToken: string;
}

/** Corpo de `POST /api/auth/password` (troca de senha do proprio usuario). */
export interface ChangePasswordRequest {
  readonly currentPassword: string;
  /** Minimo de 8 caracteres (validado no `set_password`). */
  readonly newPassword: string;
}

/**
 * Resposta de `POST /api/auth/password`. A troca revoga **todas** as sessoes do
 * usuario, inclusive a que fez a requisicao: o cliente deve encerrar a sessao
 * local e voltar ao login.
 */
export interface ChangePasswordResponse {
  readonly changed: true;
}

/** Resposta de `POST /api/auth/sessions/revoke` (quantas familias cairam). */
export interface RevokeSessionsResponse {
  readonly revoked: number;
}

/** Sessao ativa (uma familia de refresh tokens) vista pelo proprio usuario. */
export interface SessionRecord {
  /** Id da familia; tambem usado para encerrar apenas esta sessao. */
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string | null;
  /** `User-Agent` do login que abriu a sessao; `null` se ausente. */
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  /** Quando a sessao foi aberta (login). */
  readonly createdAt: string;
  /** Ultima renovacao; `null` se nunca renovada. */
  readonly lastUsedAt: string | null;
  readonly expiresAt: string;
}

/** Resposta de `GET /api/auth/sessions`. */
export interface ListSessionsResponse {
  readonly sessions: readonly SessionRecord[];
}

/** Resposta de `POST /api/auth/sessions/:sessionId/revoke`. */
export interface RevokeSessionResponse {
  readonly revoked: number;
}

/** Claims do access token; `sub` e o id do usuario. */
export interface AccessTokenClaims {
  readonly sub: string;
  readonly tid: string;
  readonly cid: string | null;
  readonly role: string | null;
  readonly iat?: number;
  readonly exp?: number;
  readonly iss?: string;
  readonly aud?: string;
}
