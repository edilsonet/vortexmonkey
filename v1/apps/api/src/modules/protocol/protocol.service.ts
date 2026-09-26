import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PHASE_2_EVENTS, type ProtocolAccessLevel } from '@vortex/contracts-be';
import type { RequestContext } from '@vortex/types';
import { DatabaseService, type SqlClient } from '../../platform/database/database.service';
import { LedgerService } from '../ledger/ledger.service';
import { RegulatoryParameterService } from '../regulatory/regulatory-parameter.service';
import { accessRank, addUtcDays, validateAccess } from './protocol.access-policy';
import type { AppendProtocolEventDto, CreateProtocolDto, DecideProtocolViewDto, RequestProtocolViewDto } from './protocol.dto';

interface ProtocolNumberRow { year: number; sequence: string; protocol_number: string }
interface ProtocolRow { id: string; tenant_id: string; user_id: string; company_id: string; protocol_number: string; entity_type: string; entity_id: string; subject: string; access_level: ProtocolAccessLevel; restriction_basis: string | null; contains_personal_data: boolean; status: string; created_by: string; created_at: Date }
interface ViewRow { id: string; protocol_id: string; tenant_id: string; company_id: string; owner_company_id: string; requested_by: string; status: string }

@Injectable()
export class ProtocolService {
  public constructor(
    private readonly database: DatabaseService,
    private readonly ledger: LedgerService,
    private readonly parameters: RegulatoryParameterService,
  ) {}

  public create(context: RequestContext, dto: CreateProtocolDto): Promise<unknown> {
    validateAccess(dto.accessLevel, dto.restrictionBasis, dto.containsPersonalData);
    if (!context.companyId) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Selecione uma empresa vinculada.' });
    return this.database.withContext(context, async (client) => {
      const numbering = (await client.query<ProtocolNumberRow>('SELECT * FROM protocol.next_protocol_number()')).rows[0];
      if (!numbering) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Não foi possível gerar o protocolo.' });
      const entityId = crypto.randomUUID();
      const ledgerId = crypto.randomUUID();
      const timelineId = crypto.randomUUID();
      const timelineLedgerId = crypto.randomUUID();
      const payload = { ...dto, protocolNumber: numbering.protocol_number, year: numbering.year, sequence: Number(numbering.sequence) };
      const result = await client.query<ProtocolRow>(
        `INSERT INTO protocol.protocols(id,tenant_id,user_id,company_id,protocol_number,year,sequence,entity_type,entity_id,subject,access_level,restriction_basis,contains_personal_data,ledger_block_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$3) RETURNING *`,
        [entityId, context.tenantId, context.userId, context.companyId, numbering.protocol_number, numbering.year, numbering.sequence, dto.entityType, dto.entityId, dto.subject, dto.accessLevel, dto.restrictionBasis ?? null, dto.containsPersonalData, ledgerId],
      );
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'PROTOCOL', entityId, actionType: 'INSERT', payload });
      await client.query(
        `INSERT INTO protocol.timeline_events(id,protocol_id,tenant_id,user_id,company_id,event_type,description,payload,access_level,restriction_basis,ledger_block_id,created_by)
         VALUES ($1,$2,$3,$4,$5,'PROTOCOL_CREATED',$6,$7::jsonb,$8,$9,$10,$4)`,
        [timelineId, entityId, context.tenantId, context.userId, context.companyId, `Protocolo ${numbering.protocol_number} criado.`, JSON.stringify(payload), dto.accessLevel, dto.restrictionBasis ?? null, timelineLedgerId],
      );
      await this.ledger.append(client, context, { id: timelineLedgerId, entityType: 'PROTOCOL_EVENT', entityId: timelineId, actionType: 'PROTOCOL_CREATED', payload });
      await this.outbox(client, context, entityId, PHASE_2_EVENTS.PROTOCOL_CREATED, payload);
      return result.rows[0];
    });
  }

  public get(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      const protocol = (await client.query<ProtocolRow>('SELECT * FROM protocol.protocols WHERE id=$1', [id])).rows[0];
      if (!protocol) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Protocolo não encontrado ou sem acesso.' });
      return protocol;
    });
  }

  public timeline(context: RequestContext, id: string): Promise<unknown> {
    return this.database.withContext(context, async (client) => {
      await this.requireProtocol(client, id);
      return (await client.query('SELECT * FROM protocol.timeline_events WHERE protocol_id=$1 ORDER BY occurred_at,id', [id])).rows;
    });
  }

  public appendEvent(context: RequestContext, protocolId: string, dto: AppendProtocolEventDto): Promise<unknown> {
    validateAccess(dto.accessLevel, dto.restrictionBasis, false);
    if (!context.companyId) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Selecione uma empresa vinculada.' });
    return this.database.withContext(context, async (client) => {
      const protocol = await this.requireProtocol(client, protocolId);
      if (accessRank(dto.accessLevel) < accessRank(protocol.access_level)) {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'O evento não pode ser menos restritivo que o protocolo.' });
      }
      const eventId = crypto.randomUUID();
      const ledgerId = crypto.randomUUID();
      const payload = { ...dto, protocolId, protocolNumber: protocol.protocol_number };
      const result = await client.query(
        `INSERT INTO protocol.timeline_events(id,protocol_id,tenant_id,user_id,company_id,event_type,description,payload,access_level,restriction_basis,ledger_block_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$4) RETURNING *`,
        [eventId, protocolId, context.tenantId, context.userId, context.companyId, dto.eventType, dto.description, JSON.stringify(dto.payload), dto.accessLevel, dto.restrictionBasis ?? null, ledgerId],
      );
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'PROTOCOL_EVENT', entityId: eventId, actionType: dto.eventType, payload, changes: dto.payload.changes });
      await this.outbox(client, context, protocolId, PHASE_2_EVENTS.PROTOCOL_EVENT_APPENDED, payload);
      return result.rows[0];
    });
  }

  public async requestView(context: RequestContext, protocolId: string, dto: RequestProtocolViewDto): Promise<unknown> {
    if (!context.companyId) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Selecione uma empresa vinculada.' });
    const responseDays = await this.parameters.getNumber('protocol.view.response_days');
    return this.database.withContext(context, async (client) => {
      const target = (await client.query<{ id: string; company_id: string; access_level: string }>('SELECT * FROM protocol.requestable_protocol($1)', [protocolId])).rows[0];
      if (!target) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Protocolo não encontrado no tenant atual.' });
      if (target.access_level === 'PUBLIC') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Protocolo público não exige vista.' });
      const viewId = crypto.randomUUID();
      const ledgerId = crypto.randomUUID();
      const dueAt = addUtcDays(new Date(), responseDays);
      const payload = { protocolId, justification: dto.justification, responseDueAt: dueAt.toISOString(), responseDays };
      const result = await client.query(
        `INSERT INTO protocol.protocol_views(id,protocol_id,tenant_id,user_id,company_id,owner_company_id,requested_by,justification,response_due_at,ledger_block_id)
         VALUES ($1,$2,$3,$4,$5,$6,$4,$7,$8,$9) RETURNING *`,
        [viewId, protocolId, context.tenantId, context.userId, context.companyId, target.company_id, dto.justification, dueAt, ledgerId],
      );
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'PROTOCOL_VIEW', entityId: viewId, actionType: 'VIEW_REQUESTED', payload });
      await this.outbox(client, context, protocolId, PHASE_2_EVENTS.PROTOCOL_VIEW_REQUESTED, payload);
      return result.rows[0];
    });
  }

  public async decideView(context: RequestContext, viewId: string, dto: DecideProtocolViewDto): Promise<unknown> {
    if (!context.companyId) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Selecione uma empresa vinculada.' });
    const accessDays = await this.parameters.getNumber('protocol.view.access_days');
    return this.database.withContext(context, async (client) => {
      const view = (await client.query<ViewRow>('SELECT * FROM protocol.protocol_views WHERE id=$1 FOR UPDATE', [viewId])).rows[0];
      if (!view) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Pedido de vista não encontrado.' });
      if (view.owner_company_id !== context.companyId) throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Somente a empresa proprietária pode decidir a vista.' });
      if (view.status !== 'PENDING') throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Pedido de vista já decidido.' });
      const decidedAt = new Date();
      const grantedUntil = dto.decision === 'GRANTED' ? addUtcDays(decidedAt, accessDays) : null;
      const ledgerId = crypto.randomUUID();
      const payload = { viewId, protocolId: view.protocol_id, decision: dto.decision, reason: dto.reason, decidedAt: decidedAt.toISOString(), grantedUntil: grantedUntil?.toISOString() ?? null, accessDays };
      const result = await client.query(
        `UPDATE protocol.protocol_views SET status=$2,decided_at=$3,decided_by=$4,granted_until=$5,decision_reason=$6,decision_ledger_block_id=$7 WHERE id=$1 RETURNING *`,
        [viewId, dto.decision, decidedAt, context.userId, grantedUntil, dto.reason, ledgerId],
      );
      await this.ledger.append(client, context, { id: ledgerId, entityType: 'PROTOCOL_VIEW', entityId: viewId, actionType: dto.decision === 'GRANTED' ? 'VIEW_GRANTED' : 'VIEW_DENIED', payload, changes: [{ field_path: 'status', old_value: 'PENDING', new_value: dto.decision }] });
      await this.outbox(client, context, view.protocol_id, PHASE_2_EVENTS.PROTOCOL_VIEW_DECIDED, payload);
      return result.rows[0];
    });
  }

  public publicSearch(query?: string): Promise<unknown> {
    return this.database.query('SELECT * FROM protocol.public_search($1,$2)', [query ?? null, 50]).then((result) => result.rows);
  }

  private async requireProtocol(client: SqlClient, id: string): Promise<ProtocolRow> {
    const protocol = (await client.query<ProtocolRow>('SELECT * FROM protocol.protocols WHERE id=$1', [id])).rows[0];
    if (!protocol) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Protocolo não encontrado ou sem acesso.' });
    return protocol;
  }

  private async outbox(client: SqlClient, context: RequestContext, aggregateId: string, eventType: string, payload: unknown): Promise<void> {
    await client.query(
      `INSERT INTO ledger.outbox_events(tenant_id,user_id,company_id,aggregate_type,aggregate_id,event_type,payload)
       VALUES ($1,$2,$3,'PROTOCOL',$4,$5,$6::jsonb)`,
      [context.tenantId, context.userId, context.companyId ?? null, aggregateId, eventType, JSON.stringify(payload)],
    );
  }
}
