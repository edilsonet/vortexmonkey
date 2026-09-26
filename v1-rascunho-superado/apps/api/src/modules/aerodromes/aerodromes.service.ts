import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import { ProtocolService } from "../protocol/protocol.service.ts";
import {
  assertPavement,
  faunaRisk,
  formatRcr,
  isSescincWithinLimit,
  nextSgsoReportDue,
  PHASE_7_AERODROMES_EVENTS,
  rwyccFromContaminant,
} from "./aerodromes.policy.ts";
import type {
  CreateAerodromeDto,
  CreateFaunaDto,
  CreateFireDto,
  CreateMaintDto,
  CreatePavementDto,
  CreateRcrDto,
} from "./aerodromes.dto.ts";

@Injectable()
export class AerodromesService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const aerodromes = await client.query(
        `SELECT a.id, a.icao_code, a.name, a.fire_category, a.status, c.corporate_name
         FROM airport.aerodromes a JOIN identity.companies c ON c.id = a.company_id
         ORDER BY a.icao_code`,
      );
      const pavement = await client.query(
        `SELECT p.id, p.runway_designator, p.pcn, p.iri_m_km, p.macrotexture_mm, a.icao_code
         FROM airport.runway_pavement p JOIN airport.aerodromes a ON a.id = p.aerodrome_id
         ORDER BY p.created_at DESC`,
      );
      const rcr = await client.query(
        `SELECT r.id, r.runway_designator, r.rwycc_t1, r.rwycc_t2, r.rwycc_t3, r.rcr_message, r.sent_to_twr, a.icao_code
         FROM airport.runway_condition_reports r JOIN airport.aerodromes a ON a.id = r.aerodrome_id
         ORDER BY r.created_at DESC LIMIT 50`,
      );
      const fire = await client.query(
        `SELECT f.id, f.incident_type, f.response_time_seconds, f.within_limit, a.icao_code
         FROM airport.fire_response_logs f JOIN airport.aerodromes a ON a.id = f.aerodrome_id
         ORDER BY f.created_at DESC LIMIT 50`,
      );
      const fauna = await client.query(
        `SELECT e.id, e.event_type, e.species, e.count, e.risk_grade, e.sent_to_sigra, a.icao_code
         FROM airport.fauna_events e JOIN airport.aerodromes a ON a.id = e.aerodrome_id
         ORDER BY e.created_at DESC LIMIT 50`,
      );
      const maint = await client.query(
        `SELECT m.id, m.area, m.notes, a.icao_code
         FROM airport.maintenance_areas m JOIN airport.aerodromes a ON a.id = m.aerodrome_id
         ORDER BY m.created_at DESC LIMIT 50`,
      );
      const counts = await client.query<{
        aerodromes: number;
        fire_deviations: number;
        fauna: number;
      }>(
        `SELECT
           (SELECT count(*)::int FROM airport.aerodromes) AS aerodromes,
           (SELECT count(*)::int FROM airport.fire_response_logs WHERE within_limit = false) AS fire_deviations,
           (SELECT count(*)::int FROM airport.fauna_events) AS fauna`,
      );
      return {
        counts: counts.rows[0],
        nextSgso: nextSgsoReportDue(new Date()).toISOString().slice(0, 10),
        aerodromes: aerodromes.rows,
        pavement: pavement.rows,
        rcr: rcr.rows,
        fire: fire.rows,
        fauna: fauna.rows,
        maintenance: maint.rows,
      };
    });
  }

  public createAerodrome(ctx: RequestContext, dto: CreateAerodromeDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.aerodromes(tenant_id, company_id, icao_code, name, fire_category)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, dto.companyId, dto.icaoCode.toUpperCase(), dto.name, dto.fireCategory ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_AERODROME",
        entityId: id,
        actionType: PHASE_7_AERODROMES_EVENTS.AERODROME_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE airport.aerodromes SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = await this.protocol.issue(client, ctx, {
        subject: `Aerodromo ${dto.icaoCode.toUpperCase()}`,
        entityType: "AP_AERODROME",
        entityId: id,
        ledgerBlockId: block.id,
      });
      return { id, protocol: proto.number };
    });
  }

  public createPavement(ctx: RequestContext, dto: CreatePavementDto) {
    this.requireTenant(ctx);
    try {
      assertPavement({ iri: dto.iri, macrotexture: dto.macrotexture });
    } catch (error) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Pavimento invalido.",
      });
    }
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.runway_pavement(tenant_id, aerodrome_id, runway_designator, pcn, iri_m_km, macrotexture_mm)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [ctx.tenantId, dto.aerodromeId, dto.runwayDesignator, dto.pcn ?? null, dto.iri, dto.macrotexture],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_PAVEMENT",
        entityId: id,
        actionType: PHASE_7_AERODROMES_EVENTS.RUNWAY_PAVEMENT_REGISTERED,
        payload: dto,
      });
      await client.query("UPDATE airport.runway_pavement SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public createRcr(ctx: RequestContext, dto: CreateRcrDto) {
    this.requireTenant(ctx);
    const t1 = dto.contaminant ? rwyccFromContaminant(dto.contaminant) : dto.rwyccT1;
    const t2 = dto.contaminant ? t1 : dto.rwyccT2;
    const t3 = dto.contaminant ? t1 : dto.rwyccT3;
    const message = formatRcr(dto.runwayDesignator, t1, t2, t3);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.runway_condition_reports(
           tenant_id, aerodrome_id, runway_designator, rwycc_t1, rwycc_t2, rwycc_t3, contaminant, rcr_message, sent_to_twr
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
        [ctx.tenantId, dto.aerodromeId, dto.runwayDesignator, t1, t2, t3, dto.contaminant ?? null, message],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_RCR",
        entityId: id,
        actionType: PHASE_7_AERODROMES_EVENTS.RCR_ISSUED,
        payload: { ...dto, message },
      });
      await client.query("UPDATE airport.runway_condition_reports SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, rcrMessage: message, sentToTwr: true };
    });
  }

  public createFire(ctx: RequestContext, dto: CreateFireDto) {
    this.requireTenant(ctx);
    const within = isSescincWithinLimit(dto.responseTimeSeconds);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.fire_response_logs(tenant_id, aerodrome_id, incident_type, response_time_seconds, within_limit)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, dto.aerodromeId, dto.incidentType, dto.responseTimeSeconds, within],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_FIRE",
        entityId: id,
        actionType: within
          ? PHASE_7_AERODROMES_EVENTS.FIRE_RESPONSE_RECORDED
          : PHASE_7_AERODROMES_EVENTS.FIRE_RESPONSE_DEVIATION,
        payload: dto,
      });
      await client.query("UPDATE airport.fire_response_logs SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      const proto = within
        ? null
        : await this.protocol.issue(client, ctx, {
            subject: `SESCINC desvio ${dto.responseTimeSeconds}s`,
            entityType: "AP_FIRE",
            entityId: id,
            ledgerBlockId: block.id,
          });
      return { id, withinLimit: within, protocol: proto?.number ?? null };
    });
  }

  public createFauna(ctx: RequestContext, dto: CreateFaunaDto) {
    this.requireTenant(ctx);
    const count = dto.count ?? 1;
    const risk = faunaRisk(count);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.fauna_events(tenant_id, aerodrome_id, event_type, species, count, risk_grade, sent_to_sigra)
         VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
        [ctx.tenantId, dto.aerodromeId, dto.eventType, dto.species ?? null, count, risk],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_FAUNA",
        entityId: id,
        actionType: PHASE_7_AERODROMES_EVENTS.FAUNA_SENT_TO_SIGRA,
        payload: { ...dto, risk },
      });
      await client.query("UPDATE airport.fauna_events SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, riskGrade: risk, sentToSigra: true };
    });
  }

  public createMaint(ctx: RequestContext, dto: CreateMaintDto) {
    this.requireTenant(ctx);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO airport.maintenance_areas(tenant_id, aerodrome_id, area, notes) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.aerodromeId, dto.area, dto.notes ?? null],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "AP_MAINT",
        entityId: id,
        actionType: "MAINTENANCE_AREA_RECORDED",
        payload: dto,
      });
      await client.query("UPDATE airport.maintenance_areas SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
