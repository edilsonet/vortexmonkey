import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DOMAIN_EVENTS } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { RegulatoryParameterService } from '../regulatory/regulatory-parameter.service';
import type { CreateProfessionalProfileDto, CreateRelationshipDto, RegisterAccreditationDto, RegisterLicenseDto } from './identity.dto';
import { addUtcDays } from './identity.policy';

@Injectable()
export class IdentityService {
  public constructor(private readonly database: DatabaseService, private readonly ledger: LedgerService, private readonly parameters: RegulatoryParameterService) {}

  public me(context: RequestContext): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const result = await client.query(`SELECT u.id, u.cpf, u.full_name, u.social_name, u.email, u.phone, u.canac, u.is_active,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('tenant_id', tu.tenant_id, 'role', tu.role)) FILTER (WHERE tu.tenant_id IS NOT NULL), '[]') AS tenants
        FROM identity.users u LEFT JOIN identity.tenant_users tu ON tu.user_id = u.id AND tu.status = 'ACTIVE' WHERE u.id = $1 GROUP BY u.id`, [context.userId]);
      return result.rows[0] ?? null;
    });
  }

  public createProfile(context: RequestContext, dto: CreateProfessionalProfileDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entityId = randomUUID(); const ledgerId = randomUUID();
      try {
        const result = await client.query(`INSERT INTO identity.professional_profiles(id, user_id, professional_type, ledger_block_id) VALUES ($1,$2,$3,$4) RETURNING *`, [entityId, context.userId, dto.professionalType, ledgerId]);
        await this.ledger.append(client, context, { id: ledgerId, entityType: 'PROFESSIONAL_PROFILE', entityId, actionType: 'INSERT', payload: dto });
        await this.outbox(client, context, entityId, DOMAIN_EVENTS.PROFILE_UPDATED, dto);
        return result.rows[0];
      } catch (error: unknown) { if (isUniqueViolation(error)) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'A pessoa já possui perfil profissional canônico.' }); throw error; }
    });
  }

  public registerLicense(context: RequestContext, dto: RegisterLicenseDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const profile = await client.query<{ id: string }>('SELECT id FROM identity.professional_profiles WHERE user_id = $1', [context.userId]);
      if (!profile.rows[0]) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Crie o perfil profissional antes da licença.' });
      const entityId = randomUUID(); const ledgerId = randomUUID();
      try {
        const result = await client.query(`INSERT INTO identity.licenses(id, profile_id, license_type, license_number, ratings, issue_date, valid_until, ledger_block_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [entityId, profile.rows[0].id, dto.licenseType, dto.licenseNumber, dto.ratings, dto.issueDate, dto.validUntil, ledgerId]);
        await this.ledger.append(client, context, { id: ledgerId, entityType: 'LICENSE', entityId, actionType: 'INSERT', payload: dto });
        await this.outbox(client, context, entityId, DOMAIN_EVENTS.LICENSE_REGISTERED, dto);
        return result.rows[0];
      } catch (error: unknown) { if (isUniqueViolation(error)) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Licença já cadastrada na fonte canônica.' }); throw error; }
    });
  }

  public async registerAccreditation(context: RequestContext, dto: RegisterAccreditationDto): Promise<unknown> {
    const parameterKey = dto.accreditationType === 'SDEA_PROVISORIO' ? 'rbac183.sdea_provisional.validity_days' : 'rbac183.accreditation.validity_days';
    const validityDays = await this.parameters.getNumber(parameterKey);
    const validUntil = addUtcDays(dto.issueDate, validityDays);
    return this.database.withContext(context, async (client) => {
      const entityId = randomUUID(); const ledgerId = randomUUID(); const payload = { ...dto, validUntil, validityParameter: parameterKey };
      try {
        const result = await client.query(`INSERT INTO identity.accreditations(id, user_id, accreditation_type, portaria_number, issue_date, scope, valid_until, ledger_block_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [entityId, context.userId, dto.accreditationType, dto.portariaNumber, dto.issueDate, dto.scope, validUntil, ledgerId]);
        await this.ledger.append(client, context, { id: ledgerId, entityType: 'ACCREDITATION', entityId, actionType: 'INSERT', payload });
        await this.outbox(client, context, entityId, DOMAIN_EVENTS.ACCREDITATION_REGISTERED, payload);
        return result.rows[0];
      } catch (error: unknown) { if (isUniqueViolation(error)) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Credenciamento já cadastrado na fonte canônica.' }); throw error; }
    });
  }

  public createRelationship(context: RequestContext, dto: CreateRelationshipDto): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const entityId = randomUUID(); const ledgerId = randomUUID(); const startsAt = new Date().toISOString();
      const result = await client.query(`INSERT INTO identity.relationships(id, tenant_id, user_id, company_id, role, scoped_modules, status, starts_at, expires_at, created_by, ledger_block_id) VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9,$10) RETURNING *`, [entityId, context.tenantId, dto.userId, dto.companyId, dto.role, dto.scopedModules, startsAt, dto.expiresAt ?? null, context.userId, ledgerId]);
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'RELATIONSHIP', entityId, actionType: 'INSERT', payload: dto });
      await this.outbox(client, context, entityId, DOMAIN_EVENTS.RELATIONSHIP_CREATED, dto);
      return result.rows[0];
    });
  }

  public listLicenses(context: RequestContext): Promise<unknown> { return this.database.withContext(context, async (client) => (await client.query(`SELECT l.* FROM identity.licenses l JOIN identity.professional_profiles p ON p.id = l.profile_id WHERE p.user_id = $1 ORDER BY l.created_at DESC`, [context.userId])).rows); }
  public listAccreditations(context: RequestContext): Promise<unknown> { return this.database.withContext(context, async (client) => (await client.query(`SELECT a.*, CASE WHEN a.valid_until < current_date THEN 'EXPIRED' WHEN a.valid_until <= current_date + ((SELECT value::text::int FROM compliance.regulatory_parameters WHERE key='rbac183.accreditation.renewal_alert_days' ORDER BY version DESC LIMIT 1) * interval '1 day') THEN 'EXPIRING' ELSE a.status END AS computed_status FROM identity.accreditations a WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [context.userId])).rows); }

  private async outbox(client: import('../../platform/database/database.service').SqlClient, context: RequestContext, aggregateId: string, eventType: string, payload: unknown): Promise<void> {
    await client.query(`INSERT INTO ledger.outbox_events(tenant_id,user_id,company_id,aggregate_type,aggregate_id,event_type,payload) VALUES ($1,$2,$3,'IDENTITY',$4,$5,$6::jsonb)`, [context.tenantId, context.userId, context.companyId ?? null, aggregateId, eventType, JSON.stringify(payload)]);
  }
}

const isUniqueViolation = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
