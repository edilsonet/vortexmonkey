import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ChangePasswordResponse,
  ListSessionsResponse,
  LoginResponse,
  RefreshRequest,
  RequestContext,
  RevokeSessionResponse,
  RevokeSessionsResponse,
  SessionRecord,
} from '@vortex/shared-dto';
import type { ChangePasswordDto } from './auth.dto';
import { DatabaseService } from '../database/database.service';
import type { LoginDto } from './auth.dto';
import { JwtService } from './jwt.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefreshTokenService } from './refresh-token.service';

interface PasswordVerification {
  readonly user_id: string | null;
  readonly ok: boolean;
  readonly locked: boolean;
}

interface Membership {
  readonly tenant_id: string;
  readonly company_id: string;
  readonly role: string;
  readonly functional_position: string | null;
}

interface RotationResult {
  readonly result: 'ROTATED' | 'NOT_FOUND' | 'EXPIRED' | 'REUSED';
  readonly user_id: string | null;
  readonly tenant_id: string | null;
  readonly company_id: string | null;
  readonly family_id: string | null;
}

/** Dispositivo que abriu a sessao (do login), usado na listagem. */
export interface SessionDevice {
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

interface SessionRow {
  readonly family_id: string;
  readonly tenant_id: string;
  readonly company_id: string | null;
  readonly user_agent: string | null;
  readonly ip_address: string | null;
  readonly created_at: Date;
  readonly last_used_at: Date | null;
  readonly expires_at: Date;
}

/**
 * Autenticacao: valida credenciais e emite o token com o vinculo ATIVO.
 *
 * A senha nunca e comparada em memoria: `identity.verify_password` (bcrypt via
 * pgcrypto) faz a verificacao e a politica de bloqueio no banco, sem trafegar o
 * hash para a aplicacao. A mensagem de falha e sempre a mesma — nao distingue
 * e-mail inexistente de senha errada.
 */
@Injectable()
export class AuthService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly notifications: NotificationsService,
  ) {}

  public async login(input: LoginDto, device: SessionDevice): Promise<LoginResponse> {
    const verified = await this.database.query<PasswordVerification>(
      'SELECT user_id, ok, locked FROM identity.verify_password($1, $2)',
      [input.email, input.password],
    );
    const verification = verified.rows[0];
    if (verification?.ok !== true || verification.user_id === null) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: verification?.locked
          ? 'Conta temporariamente bloqueada por tentativas invalidas. Tente novamente mais tarde.'
          : 'Credenciais invalidas.',
      });
    }

    const memberships = await this.database.query<Membership>(
      'SELECT tenant_id, company_id, role, functional_position FROM identity.memberships($1)',
      [verification.user_id],
    );
    if (memberships.rowCount === 0) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Usuario sem vinculo ativo em tenant/empresa.',
      });
    }

    const chosen = this.chooseMembership(memberships.rows, input);
    const context: RequestContext = {
      userId: verification.user_id,
      tenantId: chosen.tenant_id,
      companyId: chosen.company_id,
    };
    const { token, expiresIn } = this.jwt.sign({
      sub: context.userId,
      tid: context.tenantId,
      cid: context.companyId ?? null,
      role: chosen.role,
    });
    const refresh = this.refreshTokens.issue();
    await this.database.query(
      `SELECT identity.issue_refresh_token($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        refresh.id,
        context.userId,
        context.tenantId,
        context.companyId,
        refresh.hash,
        refresh.familyId,
        refresh.expiresIn,
        device.userAgent,
        device.ipAddress,
      ],
    );
    return this.respond(
      token,
      expiresIn,
      refresh.token,
      refresh.expiresIn,
      refresh.familyId,
      context,
    );
  }

  /**
   * Rotaciona o refresh token e emite um novo access token.
   *
   * A rotacao e atomica no banco: um token ja usado caracteriza vazamento e a
   * familia inteira e revogada. Mesmo num refresh valido o vinculo e reconferido
   * — perder o vinculo ACTIVE encerra a sessao em vez de continuar emitindo
   * token para um contexto que o RLS nao libera mais.
   */
  public async refresh(input: RefreshRequest, device: SessionDevice): Promise<LoginResponse> {
    const next = this.refreshTokens.issue();
    const rotated = await this.database.query<RotationResult>(
      `SELECT result, user_id, tenant_id, company_id, family_id
         FROM identity.rotate_refresh_token($1, $2, $3, $4)`,
      [this.refreshTokens.hash(input.refreshToken), next.id, next.hash, next.expiresIn],
    );
    const rotation = rotated.rows[0];
    if (rotation?.result !== 'ROTATED' || rotation.user_id === null || rotation.tenant_id === null) {
      // Reuso ja revogou a familia no banco; avisa o dono da sessao (in-app +
      // e-mail). Best-effort: a falha do aviso nao pode mascarar o 401.
      if (rotation?.result === 'REUSED' && rotation.user_id !== null && rotation.tenant_id !== null) {
        await this.notifications.notifyRefreshTokenReuse({
          userId: rotation.user_id,
          tenantId: rotation.tenant_id,
          companyId: rotation.company_id,
          familyId: rotation.family_id,
          userAgent: device.userAgent,
          ipAddress: device.ipAddress,
        });
      }
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message:
          rotation?.result === 'REUSED'
            ? 'Refresh token ja utilizado; sessao encerrada por seguranca.'
            : 'Refresh token invalido ou expirado.',
      });
    }

    const memberships = await this.database.query<Membership>(
      'SELECT tenant_id, company_id, role, functional_position FROM identity.memberships($1)',
      [rotation.user_id],
    );
    const chosen = memberships.rows.find(
      (membership) =>
        membership.tenant_id === rotation.tenant_id &&
        (rotation.company_id === null || membership.company_id === rotation.company_id),
    );
    if (chosen === undefined) {
      await this.database.query('SELECT identity.revoke_refresh_family($1)', [next.hash]);
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Vinculo ativo nao encontrado para a sessao.',
      });
    }

    const context: RequestContext = {
      userId: rotation.user_id,
      tenantId: rotation.tenant_id,
      companyId: chosen.company_id,
    };
    const { token, expiresIn } = this.jwt.sign({
      sub: context.userId,
      tid: context.tenantId,
      cid: context.companyId ?? null,
      role: chosen.role,
    });
    return this.respond(
      token,
      expiresIn,
      next.token,
      next.expiresIn,
      rotation.family_id ?? '',
      context,
    );
  }

  /** Revoga a familia do refresh token apresentado. Idempotente. */
  public async logout(input: RefreshRequest): Promise<{ revoked: number }> {
    const revoked = await this.database.query<{ count: number }>(
      'SELECT identity.revoke_refresh_family($1) AS count',
      [this.refreshTokens.hash(input.refreshToken)],
    );
    return { revoked: revoked.rows[0]?.count ?? 0 };
  }

  /**
   * Troca a senha do proprio usuario.
   *
   * A senha atual e conferida no banco (nunca em memoria) e a nova senha entra
   * por `identity.set_password`. O trigger de credenciais revoga TODAS as
   * sessoes do usuario — inclusive a que fez a troca — entao o cliente deve
   * encerrar a sessao local em seguida.
   */
  public async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    const verified = await this.database.query<{ ok: boolean }>(
      'SELECT identity.verify_user_password($1, $2) AS ok',
      [userId, input.currentPassword],
    );
    if (verified.rows[0]?.ok !== true) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Senha atual incorreta.',
      });
    }
    await this.database.query('SELECT identity.set_password($1, $2)', [
      userId,
      input.newPassword,
    ]);
    return { changed: true };
  }

  /**
   * Encerra todas as sessoes do usuario (todos os tenants). O access token em
   * uso tambem cai, pois a familia dele e revogada.
   */
  public async revokeAllSessions(userId: string): Promise<RevokeSessionsResponse> {
    const revoked = await this.database.query<{ count: number }>(
      `SELECT identity.revoke_user_sessions($1, 'USER_LOGOUT_ALL', NULL) AS count`,
      [userId],
    );
    return { revoked: revoked.rows[0]?.count ?? 0 };
  }

  /** Sessoes ativas do usuario (uma por familia de refresh tokens). */
  public async listSessions(userId: string): Promise<ListSessionsResponse> {
    const rows = await this.database.query<SessionRow>(
      `SELECT family_id, tenant_id, company_id, user_agent, ip_address,
              created_at, last_used_at, expires_at
         FROM identity.list_user_sessions($1)`,
      [userId],
    );
    const sessions: SessionRecord[] = rows.rows.map((row) => ({
      id: row.family_id,
      tenantId: row.tenant_id,
      companyId: row.company_id,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      createdAt: row.created_at.toISOString(),
      lastUsedAt: row.last_used_at?.toISOString() ?? null,
      expiresAt: row.expires_at.toISOString(),
    }));
    return { sessions };
  }

  /** Encerra uma unica sessao do usuario (confere a posse pelo `user_id`). */
  public async revokeSession(userId: string, sessionId: string): Promise<RevokeSessionResponse> {
    const revoked = await this.database.query<{ count: number }>(
      `SELECT identity.revoke_user_session($1, $2, 'USER_REVOKED_SESSION') AS count`,
      [userId, sessionId],
    );
    return { revoked: revoked.rows[0]?.count ?? 0 };
  }

  private respond(
    token: string,
    expiresIn: number,
    refreshToken: string,
    refreshExpiresIn: number,
    sessionId: string,
    context: RequestContext,
  ): LoginResponse {
    return {
      token,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      refreshExpiresIn,
      sessionId,
      context,
    };
  }

  /**
   * Escolhe o vinculo do token. Sem `tenantId`/`companyId` no pedido, usa o
   * primeiro vinculo ativo (ordem estavel por data de criacao). Com um vinculo
   * pedido que o usuario nao possui, nega: nao se "cai" em outro tenant.
   */
  private chooseMembership(memberships: readonly Membership[], input: LoginDto): Membership {
    const candidates = memberships.filter(
      (membership) =>
        (input.tenantId === undefined || membership.tenant_id === input.tenantId) &&
        (input.companyId === undefined || membership.company_id === input.companyId),
    );
    const [chosen] = candidates;
    if (chosen === undefined) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Sem vinculo ativo para o tenant/empresa informados.',
      });
    }
    return chosen;
  }
}
