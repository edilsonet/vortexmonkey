import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseService } from '../../platform/database/database.service';
import type { LoginDto } from './auth.dto';

const scrypt = promisify(scryptCallback);
export interface Membership { tenantId: string; roles: string[]; companyIds: string[] }
interface LoginRow { user_id: string; password_hash: string; salt: string; locked_until: Date | null; memberships: Membership[] }
interface RotateRow { user_id: string; memberships: Membership[] }

export const hashPassword = async (password: string, salt: string): Promise<string> => (await scrypt(password, salt, 64) as Buffer).toString('hex');
export const verifyPassword = async (password: string, salt: string, expectedHex: string): Promise<boolean> => {
  const actual = Buffer.from(await hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

@Injectable()
export class AuthService {
  public constructor(private readonly database: DatabaseService, private readonly jwt: JwtService) {}

  public async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const result = await this.database.query<LoginRow>('SELECT * FROM oauth.find_login($1)', [dto.email.toLowerCase()]);
    const account = result.rows[0];
    if (!account || (account.locked_until && account.locked_until > new Date())) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Credenciais inválidas.' });
    }
    const valid = await verifyPassword(dto.password, account.salt, account.password_hash);
    await this.database.query('SELECT oauth.record_login_result($1,$2)', [account.user_id, valid]);
    if (!valid) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Credenciais inválidas.' });
    return this.issue(account.user_id, account.memberships, randomUUID());
  }

  public async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const newRawToken = randomBytes(48).toString('base64url');
    const newId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 86_400_000);
    const result = await this.database.query<RotateRow>('SELECT * FROM oauth.rotate_refresh_token($1,$2,$3,$4)', [digest(rawToken), newId, digest(newRawToken), expiresAt]);
    const account = result.rows[0];
    if (!account) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Refresh token inválido ou expirado.' });
    const accessToken = await this.signAccessToken(account.user_id, account.memberships);
    return { accessToken, refreshToken: newRawToken, expiresIn: 900 };
  }

  public async logout(rawToken: string): Promise<{ revoked: true }> {
    await this.database.query('SELECT oauth.revoke_refresh_token($1)', [digest(rawToken)]);
    return { revoked: true };
  }

  private async issue(userId: string, memberships: Membership[], familyId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.database.query('SELECT oauth.store_refresh_token($1,$2,$3,$4,$5)', [randomUUID(), userId, familyId, digest(refreshToken), new Date(Date.now() + 30 * 86_400_000)]);
    return { accessToken: await this.signAccessToken(userId, memberships), refreshToken, expiresIn: 900 };
  }

  private signAccessToken(userId: string, memberships: Membership[]): Promise<string> {
    const scopedMemberships = memberships.map((membership) => ({ ...membership, scopes: scopesForRoles(membership.roles) }));
    return this.jwt.signAsync({ sub: userId, memberships: scopedMemberships }, { issuer: process.env.JWT_ISSUER ?? 'vortex.local', audience: process.env.JWT_AUDIENCE ?? 'vortex-api', expiresIn: '15m' });
  }
}

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const scopesForRoles = (roles: readonly string[]): string[] => {
  const scopes = new Set<string>();
  scopes.add('protocol:read');
  scopes.add('protocol:view:request');
  scopes.add('ledger:read');
  if (roles.some((role) => ['RCONTA','CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR'].includes(role))) scopes.add('identity:write');
  if (roles.some((role) => ['RCONTA','CRIADOR_EMPRESA','ADMIN','REPRESENTANTE_LEGAL','PROCURADOR'].includes(role))) scopes.add('protocol:write');
  if (roles.some((role) => ['ADMIN','REPRESENTANTE_LEGAL'].includes(role))) scopes.add('identity:relationships:write');
  if (roles.some((role) => ['ADMIN','REPRESENTANTE_LEGAL'].includes(role))) {
    scopes.add('protocol:view:decide');
    scopes.add('ledger:append');
    scopes.add('ledger:export');
    scopes.add('audit:read');
  }
  return [...scopes];
};
