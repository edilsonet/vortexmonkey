import { Inject, Injectable, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isValidCpf } from "@vortex/utils";
import type { Role } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import type { RequestContext } from "@vortex/types";
import type { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./auth.dto.ts";
import { assertCredentials, isResetExpired, resetExpiresAt } from "./auth.policy.ts";

const scrypt = promisify(scryptCb);

const hashPassword = async (password: string, salt: string): Promise<string> =>
  ((await scrypt(password, salt, 64)) as Buffer).toString("hex");

const verifyPassword = async (password: string, salt: string, expected: string): Promise<boolean> => {
  const actual = Buffer.from(await hashPassword(password, salt), "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
};

@Injectable()
export class AuthService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  public async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const cpf = dto.cpf.replace(/\D/g, "");
    if (!isValidCpf(cpf)) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "CPF invalido." });
    }
    const salt = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(dto.password, salt);
    const person = await this.db.withTransaction(async (client) => {
      const taken = await client.query("SELECT 1 FROM identity.people WHERE email = $1 OR cpf = $2", [
        dto.email.toLowerCase(),
        cpf,
      ]);
      if (taken.rowCount) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "E-mail ou CPF ja cadastrado." });
      }
      const tenant = await client.query<{ id: string }>(
        `INSERT INTO identity.tenants(name, slug) VALUES ($1, $2) RETURNING id`,
        [`Conta ${dto.fullName}`, `t-${randomBytes(4).toString("hex")}`],
      );
      const tenantId = tenant.rows[0]!.id;
      const created = await client.query<{ id: string }>(
        `INSERT INTO identity.people(cpf, full_name, email, tenant_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [cpf, dto.fullName, dto.email.toLowerCase(), tenantId],
      );
      const personId = created.rows[0]!.id;
      await client.query(`INSERT INTO oauth.credentials(person_id, email, password_hash, salt) VALUES ($1,$2,$3,$4)`, [
        personId, dto.email.toLowerCase(), passwordHash, salt,
      ]);
      await client.query(
        `INSERT INTO identity.tenant_members(tenant_id, person_id, role, status) VALUES ($1,$2,'RCONTA','ACTIVE')`,
        [tenantId, personId],
      );
      await client.query(
        `INSERT INTO identity.field_validations(person_id, field_name, level, source) VALUES ($1,'cpf','N1','sistema'), ($1,'email','N1','sistema')`,
        [personId],
      );
      await client.query(
        `INSERT INTO stock.holdings(tenant_id, kind, owner_person_id, origin_mark) VALUES ($1,'PERSONAL',$2,'PERSONAL')`,
        [tenantId, personId],
      );
      return { personId, tenantId };
    });
    return this.issue(person.personId, person.tenantId, null, ["RCONTA"]);
  }

  public async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      assertCredentials(dto.email ?? "", dto.password ?? "");
    } catch (error) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Credenciais invalidas.",
      });
    }
    const result = await this.db.query<{
      person_id: string;
      password_hash: string;
      salt: string;
      locked_until: Date | null;
      tenant_id: string | null;
      roles: Role[] | null;
    }>(
      `SELECT c.person_id, c.password_hash, c.salt, c.locked_until, p.tenant_id,
              ARRAY(
                SELECT role FROM (
                  SELECT tm.role FROM identity.tenant_members tm WHERE tm.person_id = c.person_id AND tm.status = 'ACTIVE'
                  UNION
                  SELECT r.role FROM identity.relationships r WHERE r.person_id = c.person_id AND r.status = 'ACTIVE'
                ) roles
              ) AS roles
       FROM oauth.credentials c JOIN identity.people p ON p.id = c.person_id
       WHERE c.email = $1`,
      [dto.email.toLowerCase()],
    );
    const row = result.rows[0];
    if (!row || (row.locked_until && row.locked_until > new Date())) {
      throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Credenciais invalidas." });
    }
    const valid = await verifyPassword(dto.password, row.salt, row.password_hash);
    if (!valid) throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Credenciais invalidas." });
    return this.issue(row.person_id, row.tenant_id, null, row.roles ?? ["RCONTA"]);
  }

  public async changePassword(ctx: RequestContext, dto: ChangePasswordDto): Promise<{ changed: true }> {
    if (dto.currentPassword === dto.newPassword) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "A nova senha deve ser diferente da atual." });
    }
    const result = await this.db.query<{ password_hash: string; salt: string }>(
      "SELECT password_hash, salt FROM oauth.credentials WHERE person_id = $1",
      [ctx.personId],
    );
    const row = result.rows[0];
    if (!row) throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Credenciais invalidas." });
    const valid = await verifyPassword(dto.currentPassword, row.salt, row.password_hash);
    if (!valid) throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Senha atual incorreta." });
    const salt = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(dto.newPassword, salt);
    await this.db.query("UPDATE oauth.credentials SET password_hash = $2, salt = $3, failed_attempts = 0 WHERE person_id = $1", [
      ctx.personId,
      passwordHash,
      salt,
    ]);
    return { changed: true };
  }

  public async forgot(dto: ForgotPasswordDto): Promise<{ sent: true; token?: string }> {
    const email = dto.email.toLowerCase().trim();
    const found = await this.db.query<{ person_id: string; tenant_id: string | null }>(
      `SELECT c.person_id, p.tenant_id FROM oauth.credentials c
       JOIN identity.people p ON p.id = c.person_id WHERE c.email = $1`,
      [email],
    );
    const row = found.rows[0];
    if (!row) return { sent: true };
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expires = resetExpiresAt(new Date());
    await this.db.query(
      `INSERT INTO oauth.password_resets(person_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [row.person_id, tokenHash, expires.toISOString()],
    );
    await this.db.query(
      `INSERT INTO communication.emails(tenant_id, person_id, template, subject, body, kind, status)
       VALUES ($1,$2,'PASSWORD_RESET','Recuperar senha VORTEX',$3,'TRANSACTIONAL','QUEUED')`,
      [row.tenant_id, row.person_id, `Use o token ${token} em /recuperar. Expira em 1 hora.`],
    );
    return { sent: true, token };
  }

  public async reset(dto: ResetPasswordDto): Promise<{ changed: true }> {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");
    const found = await this.db.query<{ id: string; person_id: string; expires_at: Date; used_at: Date | null }>(
      `SELECT id, person_id, expires_at, used_at FROM oauth.password_resets WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = found.rows[0];
    if (!row || row.used_at) {
      throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Token de recuperacao invalido." });
    }
    if (isResetExpired(new Date(), new Date(row.expires_at))) {
      throw new UnauthorizedException({ code: "AUTH_REQUIRED", message: "Token de recuperacao expirado." });
    }
    const salt = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(dto.newPassword, salt);
    await this.db.query("UPDATE oauth.credentials SET password_hash = $2, salt = $3, failed_attempts = 0 WHERE person_id = $1", [
      row.person_id,
      passwordHash,
      salt,
    ]);
    await this.db.query("UPDATE oauth.password_resets SET used_at = now() WHERE id = $1", [row.id]);
    return { changed: true };
  }

  private async issue(
    personId: string,
    tenantId: string | null,
    companyId: string | null,
    roles: Role[],
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const refresh = randomBytes(48).toString("base64url");
    await this.db.query(
      `INSERT INTO oauth.refresh_tokens(person_id, family_id, token_hash, expires_at)
       VALUES ($1, gen_random_uuid(), $2, now() + interval '7 days')`,
      [personId, createHash("sha256").update(refresh).digest("hex")],
    );
    const accessToken = await this.jwt.signAsync({
      sub: personId,
      personId,
      tenantId,
      companyId,
      roles,
      scopes: scopesFor(roles),
    });
    return { accessToken, refreshToken: refresh, expiresIn: 900 };
  }
}

const scopesFor = (roles: Role[]): string[] => {
  const scopes = new Set(["identity:read", "ledger:read", "protocol:read"]);
  if (roles.some((r) => ["RCONTA", "ADMIN", "REPRESENTANTE_LEGAL", "CRIADOR_EMPRESA"].includes(r))) {
    scopes.add("identity:write");
    scopes.add("protocol:write");
    scopes.add("stock:write");
  }
  if (roles.some((r) => ["ADMIN", "REPRESENTANTE_LEGAL"].includes(r))) {
    scopes.add("ledger:append");
    scopes.add("recruitment:write");
  }
  return [...scopes];
};
