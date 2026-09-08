import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { isValidCnpj } from "@vortex/utils";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import type { ConfirmRelationshipDto, CreateCompanyDto, CreateRelationshipDto, SetValidationDto } from "./identity.dto.ts";

@Injectable()
export class IdentityService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public me(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const person = await client.query(
        `SELECT p.id, p.cpf, p.full_name, p.social_name, p.email, p.phone, p.canac, p.tenant_id,
                p.birth_date, p.professional_email, p.professional_phone,
                COALESCE(jsonb_agg(DISTINCT jsonb_build_object('field', fv.field_name, 'level', fv.level, 'source', fv.source))
                  FILTER (WHERE fv.id IS NOT NULL), '[]') AS validations
         FROM identity.people p
         LEFT JOIN identity.field_validations fv ON fv.person_id = p.id
         WHERE p.id = $1
         GROUP BY p.id`,
        [ctx.personId],
      );
      const addresses = await client.query(
        `SELECT id, kind, street, number, neighborhood, city, state, country, cep
         FROM identity.addresses WHERE person_id = $1 ORDER BY kind`,
        [ctx.personId],
      );
      const companies = await client.query(
        `SELECT c.id, c.cnpj, c.corporate_name, c.trade_name, r.id AS relationship_id, r.role, r.status,
                r.person_confirmed, r.company_confirmed,
                (SELECT jsonb_build_object('street', a.street, 'number', a.number, 'neighborhood', a.neighborhood,
                                           'city', a.city, 'state', a.state, 'cep', a.cep)
                 FROM identity.addresses a WHERE a.company_id = c.id AND a.kind = 'COMPANY' LIMIT 1) AS address
         FROM identity.companies c
         JOIN identity.relationships r ON r.company_id = c.id
         WHERE r.person_id = $1
         ORDER BY c.corporate_name`,
        [ctx.personId],
      );
      return { person: person.rows[0] ?? null, addresses: addresses.rows, companies: companies.rows, roles: ctx.roles };
    });
  }

  public dashboard(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const people = await client.query("SELECT count(*)::int AS n FROM identity.people WHERE tenant_id = $1", [ctx.tenantId]);
      const companies = await client.query("SELECT count(*)::int AS n FROM identity.companies WHERE tenant_id = $1", [ctx.tenantId]);
      const pending = await client.query(
        "SELECT count(*)::int AS n FROM identity.relationships WHERE tenant_id = $1 AND status = 'PENDING'",
        [ctx.tenantId],
      );
      const protocols = await client.query("SELECT count(*)::int AS n FROM protocol.protocols WHERE tenant_id = $1", [ctx.tenantId]);
      const blocks = await client.query("SELECT count(*)::int AS n FROM ledger.ledger_blocks WHERE tenant_id = $1", [ctx.tenantId]);
      return {
        people: people.rows[0]?.n ?? 0,
        companies: companies.rows[0]?.n ?? 0,
        pendingLinks: pending.rows[0]?.n ?? 0,
        protocols: protocols.rows[0]?.n ?? 0,
        ledgerBlocks: blocks.rows[0]?.n ?? 0,
      };
    });
  }

  public createCompany(ctx: RequestContext, dto: CreateCompanyDto) {
    const cnpj = dto.cnpj.replace(/\D/g, "");
    if (!isValidCnpj(cnpj)) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "CNPJ invalido." });
    }
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO identity.companies(cnpj, corporate_name, trade_name, tenant_id)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [cnpj, dto.corporateName, dto.tradeName ?? null, ctx.tenantId],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "COMPANY", entityId: id, actionType: "INSERT", payload: dto,
      });
      await this.protocol.issue(client, ctx, {
        subject: `Cadastro empresarial ${dto.corporateName}`,
        entityType: "COMPANY",
        entityId: id,
        ledgerBlockId: block.id,
      });
      await client.query(
        `INSERT INTO stock.holdings(tenant_id, kind, owner_company_id, origin_mark)
         VALUES ($1,'COMPANY',$2,'COMPANY')`,
        [ctx.tenantId, id],
      );
      await client.query(
        `INSERT INTO identity.relationships(tenant_id, person_id, company_id, role, person_confirmed, company_confirmed, status, created_by)
         VALUES ($1,$2,$3,'CRIADOR_EMPRESA',true,false,'PENDING',$2)`,
        [ctx.tenantId, ctx.personId, id],
      );
      return { id };
    });
  }

  public createRelationship(ctx: RequestContext, dto: CreateRelationshipDto) {
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO identity.relationships(tenant_id, person_id, company_id, role, person_confirmed, company_confirmed, status, created_by)
         VALUES ($1,$2,$3,$4,false,false,'PENDING',$5) RETURNING id`,
        [ctx.tenantId, dto.personId, dto.companyId, dto.role, ctx.personId],
      );
      const id = inserted.rows[0]!.id;
      await this.ledger.append(client, ctx, {
        entityType: "RELATIONSHIP", entityId: id, actionType: "INSERT", payload: dto,
      });
      return { id, status: "PENDING" };
    });
  }

  public confirmRelationship(ctx: RequestContext, id: string, dto: ConfirmRelationshipDto) {
    return this.db.withContext(ctx, async (client) => {
      const found = await client.query<{
        id: string; person_id: string; company_id: string; person_confirmed: boolean; company_confirmed: boolean; status: string;
      }>("SELECT id, person_id, company_id, person_confirmed, company_confirmed, status FROM identity.relationships WHERE id = $1", [id]);
      const row = found.rows[0];
      if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Vinculo nao encontrado." });
      if (dto.side === "PERSON" && row.person_id !== ctx.personId) {
        throw new ForbiddenException({ code: "PERMISSION_DENIED", message: "Somente a pessoa confirma o lado pessoal." });
      }
      const personConfirmed = dto.side === "PERSON" ? true : row.person_confirmed;
      const companyConfirmed = dto.side === "COMPANY" ? true : row.company_confirmed;
      const status = personConfirmed && companyConfirmed ? "ACTIVE" : "PENDING";
      await client.query(
        `UPDATE identity.relationships SET person_confirmed = $2, company_confirmed = $3, status = $4 WHERE id = $1`,
        [id, personConfirmed, companyConfirmed, status],
      );
      await this.ledger.append(client, ctx, {
        entityType: "RELATIONSHIP", entityId: id, actionType: "CONFIRM", payload: { side: dto.side, status },
      });
      return { id, status, personConfirmed, companyConfirmed };
    });
  }

  public setValidation(ctx: RequestContext, dto: SetValidationDto) {
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query(
        `INSERT INTO identity.field_validations(person_id, field_name, level, source)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.personId, dto.fieldName, dto.level, dto.source ?? "sistema"],
      );
      return inserted.rows[0];
    });
  }
}
